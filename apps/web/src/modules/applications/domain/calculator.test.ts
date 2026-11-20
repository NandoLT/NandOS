import { describe, expect, it } from 'vitest'
import { calculatorKeyboardKey, calculatorReducer, initialCalculator } from './calculator'
import type { CalculatorKey } from './calculator'

function enter(...keys: CalculatorKey[]) {
  return keys.reduce((state, key) => calculatorReducer(state, { key }), initialCalculator)
}

describe('standard Calculator', () => {
  it('chains operations immediately, replaces a pending operator and repeats equals', () => {
    expect(enter('2', '+', '3', '*', '4', '=').entry).toBe('20')
    expect(enter('2', '+', '*', '4', '=', '=').entry).toBe('32')
    expect(enter('2', '+', '=').entry).toBe('4')
  })

  it('handles percentages in an additive operation, decimals and editing the current entry', () => {
    expect(enter('2', '0', '0', '+', '1', '0', '%', '=').entry).toBe('220')
    expect(enter('2', '0', '0', '*', '1', '0', '%', '=').entry).toBe('20')
    expect(enter('.', '1', '+', '.', '2', '=').entry).toBe('0.3')
    expect(enter('2', '+', '5', '6', 'backspace', '=').entry).toBe('7')
    expect(enter('2', '+', '5', 'CE', '3', '=').entry).toBe('5')
  })

  it('keeps memory when clearing or recovering from errors', () => {
    expect(enter('9', 'sqrt', 'MS', 'C', '2', 'M+', 'C', 'MR').entry).toBe('5')
    expect(enter('9', 'MS', 'C', 'MC', 'MR').memory).toBeNull()
    expect(enter('2', '/', '0', '=').error).toBe('No se puede dividir por cero')
    expect(enter('2', '/', '0', '=', '5').entry).toBe('5')
    expect(enter('2', 'sign', 'sqrt').error).toBe('Entrada no válida')
    expect(enter('4', 'reciprocal').entry).toBe('0.25')
  })

  it('accepts a localized number from the clipboard and maps keyboard shortcuts', () => {
    const pending = enter('2', '+')
    const pasted = calculatorReducer(pending, { paste: ' 1,5 ' })
    expect(calculatorReducer(pasted, { key: '=' }).entry).toBe('3.5')
    expect(calculatorReducer(pending, { paste: '2+3' })).toBe(pending)
    expect(calculatorKeyboardKey(',')).toBe('.')
    expect(calculatorKeyboardKey('Enter')).toBe('=')
    expect(calculatorKeyboardKey('Delete')).toBe('CE')
  })
})
