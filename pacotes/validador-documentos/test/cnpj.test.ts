import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cnpjValido, formatarCnpj, limparCnpj, mascaraCnpj } from '../src/index.ts';

describe('CNPJ', () => {
  it('aceita CNPJ numérico válido com ou sem pontuação', () => {
    assert.equal(cnpjValido('11.222.333/0001-81'), true);
    assert.equal(cnpjValido('11222333000181'), true);
  });

  it('aceita o CNPJ alfanumérico (exemplo oficial da Receita)', () => {
    assert.equal(cnpjValido('12.ABC.345/01DE-35'), true);
    assert.equal(cnpjValido('12.abc.345/01de-35'), true);
  });

  it('recusa dígito verificador errado, sequência repetida e formato errado', () => {
    assert.equal(cnpjValido('11.222.333/0001-80'), false);
    assert.equal(cnpjValido('45.976.F31/1111-11'), false);
    assert.equal(cnpjValido('00.000.000/0000-00'), false);
    assert.equal(cnpjValido('11.222.333/0001-8A'), false);
    assert.equal(cnpjValido('1122233300018'), false);
  });

  it('recusa entrada vazia ou que não é texto', () => {
    assert.equal(cnpjValido(''), false);
    assert.equal(cnpjValido(null), false);
    assert.equal(cnpjValido(undefined), false);
  });

  it('limpa e formata', () => {
    assert.equal(limparCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
    assert.equal(formatarCnpj('12ABC34501DE35'), '12.ABC.345/01DE-35');
    assert.equal(formatarCnpj('1122'), '1122');
  });

  it('mascara enquanto a pessoa digita', () => {
    assert.equal(mascaraCnpj('12'), '12');
    assert.equal(mascaraCnpj('12abc3'), '12.ABC.3');
    assert.equal(mascaraCnpj('11222333000181'), '11.222.333/0001-81');
    assert.equal(mascaraCnpj('11222333000181999'), '11.222.333/0001-81');
  });
});
