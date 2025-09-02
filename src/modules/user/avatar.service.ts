import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Express } from 'express';

@Injectable()
export class AvatarService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    const bucketName = this.config.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('CLOUDFLARE_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('CLOUDFLARE_SECRET_ACCESS_KEY');

    if (!bucketName || !accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Configurações do Cloudflare R2 não encontradas');
    }

    this.bucketName = bucketName;
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async generateUploadUrl(userId: string, fileType: string, fileSize: number): Promise<{ uploadUrl: string; key: string }> {
    // Validar tipo de arquivo
    if (!this.isValidImageType(fileType)) {
      throw new BadRequestException('Tipo de arquivo não suportado. Use JPG, PNG ou GIF.');
    }

    // Validar tamanho do arquivo
    await this.validateFileSize(fileSize);

    // Gerar chave única para o arquivo
    const fileExtension = fileType.split('/')[1];
    const key = `avatars/${userId}/${randomUUID()}.${fileExtension}`;

    // Gerar URL de upload pré-assinada
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: fileType,
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hora

    return { uploadUrl, key };
  }

  async deleteAvatar(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async uploadAvatarDirectly(userId: string, file: Express.Multer.File): Promise<{ key: string; url: string }> {
    // Validar tipo de arquivo
    if (!this.isValidImageType(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não suportado. Use JPG, PNG ou GIF.');
    }

    // Validar tamanho do arquivo
    await this.validateFileSize(file.size);

    // Gerar chave única para o arquivo
    const fileExtension = file.mimetype.split('/')[1];
    const key = `avatars/${userId}/${randomUUID()}.${fileExtension}`;

    // Fazer upload para R2
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getAvatarUrl(key),
    };
  }

  getAvatarUrl(key: string): string {
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    if (!accountId) {
      throw new Error('Configuração do Cloudflare Account ID não encontrada');
    }
    // URL pública do R2 - formato correto para acesso direto
    return `https://${this.bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
  }

  async getAvatarDisplayUrl(key: string): Promise<string | null> {
    if (!key) return null;
    
    try {
      // Gerar URL pré-assinada para exibição (24 horas de validade)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 86400 });
      return signedUrl;
    } catch (error) {
      console.error('Erro ao gerar URL pré-assinada:', error);
      // Fallback para URL pública (pode não funcionar se bucket não for público)
      return this.getAvatarUrl(key);
    }
  }

  private isValidImageType(fileType: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    return validTypes.includes(fileType);
  }

  async validateFileSize(fileSize: number): Promise<void> {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize > maxSize) {
      throw new BadRequestException('Arquivo muito grande. Tamanho máximo: 5MB');
    }
  }
}
