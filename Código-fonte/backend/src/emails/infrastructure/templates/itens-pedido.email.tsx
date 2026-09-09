import { Hr, Row, Column, Text } from '@react-email/components';
import { ItemPedidoEmail, formatarMoedaEmail } from './dados-pedido-email';

// Compartilhado entre confirmação/pagamento aprovado — não duplica a tabela de itens
// em dois templates. Row/Column (não <table> cru) porque são os primitivos do
// @react-email/components que já compilam pra <table> HTML por baixo, mantendo
// compatibilidade com Outlook.
export function ItensPedidoEmail({ itens, total }: { itens: ItemPedidoEmail[]; total: number }) {
  return (
    <>
      <Hr style={{ borderColor: '#dce6f5', margin: '16px 0 12px' }} />
      {itens.map((item, indice) => (
        <Row key={indice} style={{ marginBottom: '6px' }}>
          <Column>
            <Text style={{ fontSize: '13px', color: '#0a0e1a', margin: 0 }}>
              {item.quantidade}× {item.nome}
            </Text>
          </Column>
          <Column align="right">
            <Text style={{ fontSize: '13px', color: '#0a0e1a', margin: 0 }}>
              {formatarMoedaEmail(item.precoUnitario * item.quantidade)}
            </Text>
          </Column>
        </Row>
      ))}
      <Hr style={{ borderColor: '#dce6f5', margin: '12px 0' }} />
      <Row>
        <Column>
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b1f4d', margin: 0 }}>
            Total
          </Text>
        </Column>
        <Column align="right">
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#0b1f4d', margin: 0 }}>
            {formatarMoedaEmail(total)}
          </Text>
        </Column>
      </Row>
    </>
  );
}
