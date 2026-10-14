import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cpfValido, formatarCpf, limparCpf, mascaraCpf, ocultarCpf } from '../src/index.ts';

describe('CPF', () => {
  it('aceita CPF válido com ou sem pontuação', () => {
    assert.equal(cpfValido('529.982.247-25'), true);
    assert.equal(cpfValido('52998224725'), true);
    assert.equal(cpfValido('123.456.789-09'), true);
  });

  it('recusa dígito verificador errado, sequência repetida e tamanho errado', () => {
    assert.equal(cpfValido('529.982.247-24'), false);
    assert.equal(cpfValido('111.111.111-11'), false);
    assert.equal(cpfValido('5299822472'), false);
    assert.equal(cpfValido('529982247250'), false);
  });

  it('recusa entrada vazia ou que não é texto', () => {
    assert.equal(cpfValido(''), false);
    assert.equal(cpfValido(null), false);
    assert.equal(cpfValido(undefined), false);
  });

  it('limpa, formata e oculta', () => {
    assert.equal(limparCpf('529.982.247-25'), '52998224725');
    assert.equal(formatarCpf('52998224725'), '529.982.247-25');
    assert.equal(formatarCpf('529'), '529');
    assert.equal(ocultarCpf('529.982.247-25'), '***.982.247-**');
  });

  it('mascara enquanto a pessoa digita', () => {
    assert.equal(mascaraCpf('529'), '529');
    assert.equal(mascaraCpf('5299'), '529.9');
    assert.equal(mascaraCpf('5299822'), '529.982.2');
    assert.equal(mascaraCpf('52998224725'), '529.982.247-25');
    assert.equal(mascaraCpf('52998224725999'), '529.982.247-25');
    assert.equal(mascaraCpf('abc'), '');
  });
});
