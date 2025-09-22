import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvatarService } from './avatar.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly avatarService: AvatarService,
  ) {}

  @Post()
  create(@Body() dto: CreateUserDto, @Query('ref') ref?: string) {
    // Se o parâmetro ref foi fornecido, adicionar ao DTO
    if (ref) {
      dto.referred_at = ref;
    }
    return this.service.create(dto).then((user) => ({ id: user.id }));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.service.getMe(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.service.updateMe(req.user.sub, dto);
  }

  @Get('me/password-check')
  @UseGuards(JwtAuthGuard)
  checkPassword(@Req() req: any) {
    return this.service.checkPassword(req.user.sub);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.service.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/verify-email')
  verify(@Param('id') id: string, @Body() body: { code: string }) {
    return this.service.verifyEmail(id, body.code);
  }

  @Post(':id/resend-verification')
  resendVerification(@Param('id') id: string) {
    return this.service.resendVerificationCode(id);
  }

  // Rotas específicas de avatar - devem vir ANTES das rotas com parâmetros
  @Post('me/avatar/upload-url')
  @UseGuards(JwtAuthGuard)
  generateAvatarUploadUrl(@Req() req: any, @Body() body: { fileType: string; fileSize: number }) {
    return this.avatarService.generateUploadUrl(req.user.sub, body.fileType, body.fileSize);
  }

  @Post('me/avatar/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const result = await this.avatarService.uploadAvatarDirectly(req.user.sub, file);
    
    // Atualizar avatar no usuário
    await this.service.updateAvatar(req.user.sub, result.key);
    
    return result;
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  updateAvatar(@Req() req: any, @Body() body: { avatarKey: string }) {
    return this.service.updateAvatar(req.user.sub, body.avatarKey);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  deleteAvatar(@Req() req: any) {
    return this.service.deleteAvatar(req.user.sub);
  }

  @Get('me/referrals')
  @UseGuards(JwtAuthGuard)
  async getReferrals(@Req() req: any) {
    return this.service.getReferrals(req.user.sub);
  }

  @Get('me/referral-stats')
  @UseGuards(JwtAuthGuard)
  async getReferralStats(@Req() req: any) {
    return this.service.getReferralStats(req.user.sub);
  }

  @Get('me/license-sales')
  @UseGuards(JwtAuthGuard)
  async getLicenseSales(@Req() req: any) {
    return this.service.getLicenseSales(req.user.sub);
  }

  @Get('me/referral-tree')
  @UseGuards(JwtAuthGuard)
  async getReferralTree(@Req() req: any) {
    return this.service.getReferralTree(req.user.sub);
  }

  @Get('me/referral-stats-by-level')
  @UseGuards(JwtAuthGuard)
  async getReferralStatsByLevel(@Req() req: any) {
    return this.service.getReferralStatsByLevel(req.user.sub);
  }

  @Get('me/referral-earnings')
  @UseGuards(JwtAuthGuard)
  async getReferralEarnings(@Req() req: any) {
    return this.service.getReferralEarnings(req.user.sub);
  }
}
