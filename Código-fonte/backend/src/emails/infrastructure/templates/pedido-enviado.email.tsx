import { Button, Text } from '@react-email/components';
import { LayoutBaseEmail, LinhaResumo } from './layout-base.email';
import { DadosPedidoEmail } from './dados-pedido-email';

export function PedidoEnviadoEmail({
  numero,
  nomeCliente,
  codigoRastreio,
  linkAcompanhamento,
}: DadosPedidoEmail) {
  return (
    <LayoutBaseEmail
      preview={`Seu pedido #${numero} saiu para entrega`}
      titulo={`Seu pedido está a caminho, ${nomeCliente.split(' ')[0]}!`}
    >
      <Text style={{ fontSize: '14px', color: '#0a0e1a', lineHeight: '1.5' }}>
        O pedido <strong>#{numero}</strong> foi enviado.
        {codigoRastreio ? ' Use o código abaixo para acompanhar a entrega.' : ''}
      </Text>

      {codigoRastreio && <LinhaResumo rotulo="Código de rastreio" valor={codigoRastreio} />}

      {linkAcompanhamento && (
        <Button
          href={linkAcompanhamento}
          style={{
            backgroundColor: '#0b1f4d',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 'bold',
            padding: '12px 20px',
            borderRadius: '8px',
            marginTop: '20px',
          }}
        >
          Acompanhar pedido
        </Button>
      )}
    </LayoutBaseEmail>
  );
}

export default PedidoEnviadoEmail;
