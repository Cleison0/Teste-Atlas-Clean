import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListarRegrasAtacadoUseCase } from '../application/listar-regras-atacado.use-case';
import { CriarRegraAtacadoUseCase } from '../application/criar-regra-atacado.use-case';
import { AtualizarRegraAtacadoUseCase } from '../application/atualizar-regra-atacado.use-case';
import { CriarRegraAtacadoDto } from './dto/criar-regra-atacado.dto';
import { AtualizarRegraAtacadoDto } from './dto/atualizar-regra-atacado.dto';
import { RegraAtacadoResponseDto } from './dto/regra-atacado-response.dto';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { PapelUsuario } from '../../auth/domain/papel-usuario.enum';

// Admin-only inteiro (mesmo padrão de CuponsController) — não existe consumo
// público dessas regras, o storefront só vê o resultado (descontoAtacado) já
// aplicado no carrinho.
@ApiTags('atacado')
@Controller('regras-atacado')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PapelUsuario.ADMIN)
export class RegrasAtacadoController {
  constructor(
    private readonly listarRegrasAtacadoUseCase: ListarRegrasAtacadoUseCase,
    private readonly criarRegraAtacadoUseCase: CriarRegraAtacadoUseCase,
    private readonly atualizarRegraAtacadoUseCase: AtualizarRegraAtacadoUseCase,
  ) {}

  @Get()
  async listar(): Promise<RegraAtacadoResponseDto[]> {
    const regras = await this.listarRegrasAtacadoUseCase.executar();
    return regras.map(RegraAtacadoResponseDto.fromDomain);
  }

  @Post()
  async criar(@Body() dto: CriarRegraAtacadoDto): Promise<RegraAtacadoResponseDto> {
    const regra = await this.criarRegraAtacadoUseCase.executar(dto);
    return RegraAtacadoResponseDto.fromDomain(regra);
  }

  @Put(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarRegraAtacadoDto,
  ): Promise<RegraAtacadoResponseDto> {
    const regra = await this.atualizarRegraAtacadoUseCase.executar(id, dto);
    return RegraAtacadoResponseDto.fromDomain(regra);
  }
}
