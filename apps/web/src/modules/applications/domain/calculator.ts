type Operator = '+' | '-' | '*' | '/'
type Operation = { operator: Operator; operand: number }
type Phase = 'typing' | 'waiting' | 'result'
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type CalculatorKey = Digit | Operator | '.' | '=' | 'CE' | 'C' | 'backspace' |
  'sign' | 'sqrt' | '%' | 'reciprocal' | 'MC' | 'MR' | 'MS' | 'M+'

type CalculatorState = {
  entry: string
  phase: Phase
  pending: Operation | null
  repeat: Operation | null
  memory: number | null
  error: string | null
}
export type CalculatorAction = { key: CalculatorKey } | { paste: string }

const MAX_DIGITS = 15
export const initialCalculator: CalculatorState = {
  entry: '0', phase: 'result', pending: null, repeat: null, memory: null, error: null,
}

function fail(state: CalculatorState, error: string): CalculatorState {
  return { ...initialCalculator, memory: state.memory, error }
}

function precision(value: number) {
  return Number(value.toPrecision(MAX_DIGITS))
}

function showResult(state: CalculatorState, result: number): CalculatorState {
  return Number.isFinite(result)
    ? { ...state, entry: String(precision(result)), phase: 'result', error: null }
    : fail(state, 'Desbordamiento')
}

function calculate(state: CalculatorState, operator: Operator, left: number, right: number) {
  switch (operator) {
    case '+': return showResult(state, left + right)
    case '-': return showResult(state, left - right)
    case '*': return showResult(state, left * right)
    case '/': return right === 0 ? fail(state, 'No se puede dividir por cero') : showResult(state, left / right)
  }
}

function typeValue(state: CalculatorState, key: string): CalculatorState {
  const previous = state.phase === 'typing' ? state.entry : '0'
  if (key === '.') {
    if (previous.includes('.')) return state
    return { ...state, phase: 'typing', entry: previous + '.', repeat: null }
  }
  if (previous.replace(/[^0-9]/g, '').length >= MAX_DIGITS) return state
  const entry = previous === '0' ? key : previous === '-0' ? '-' + key : previous + key
  return { ...state, phase: 'typing', entry, repeat: null }
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if ('paste' in action) {
    const value = action.paste.trim().replace(',', '.')
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value))) return state
    return showResult({ ...state, repeat: null }, Number(value))
  }

  const { key } = action
  if (key === 'C' || (key === 'CE' && state.error)) return { ...initialCalculator, memory: state.memory }
  if (key === 'MC') return { ...state, memory: null }
  if (/^\d$/.test(key) || key === '.') {
    return typeValue(state.error ? { ...initialCalculator, memory: state.memory } : state, key)
  }
  if (state.error) return state
  const value = Number(state.entry)
  const { pending } = state

  switch (key) {
    case 'CE': return { ...state, entry: '0', phase: 'typing', repeat: null }
    case 'backspace': {
      if (state.phase !== 'typing') return state
      const entry = state.entry.slice(0, -1)
      return { ...state, entry: !entry || entry === '-' ? '0' : entry }
    }
    case 'sign': {
      if (state.phase === 'waiting' || state.phase === 'typing' || value === 0) {
        const entry = state.phase === 'waiting' ? '0' : state.entry
        return { ...state, entry: entry.startsWith('-') ? entry.slice(1) : '-' + entry, phase: 'typing', repeat: null }
      }
      return showResult({ ...state, repeat: null }, -value)
    }
    case 'sqrt': return value < 0 ? fail(state, 'Entrada no válida') : showResult({ ...state, repeat: null }, Math.sqrt(value))
    case 'reciprocal': return calculate({ ...state, repeat: null }, '/', 1, value)
    case '%': {
      const base = pending && (pending.operator === '+' || pending.operator === '-') ? pending.operand : 1
      return showResult({ ...state, repeat: null }, base * (value / 100))
    }
    case 'MR': return state.memory === null ? state : showResult({ ...state, repeat: null }, state.memory)
    case 'MS': return { ...state, memory: value }
    case 'M+': {
      const total = (state.memory ?? 0) + value
      return Number.isFinite(total) ? { ...state, memory: precision(total) } : fail(state, 'Desbordamiento')
    }
    case '+':
    case '-':
    case '*':
    case '/': {
      const next = pending && state.phase !== 'waiting' ? calculate(state, pending.operator, pending.operand, value) : state
      return next.error ? next : {
        ...next, phase: 'waiting', repeat: null, pending: { operator: key, operand: Number(next.entry) },
      }
    }
    case '=': {
      if (!pending && !state.repeat) return { ...state, phase: 'result' }
      const operation = pending ? { operator: pending.operator, operand: value } : state.repeat!
      return calculate({ ...state, pending: null, repeat: operation }, operation.operator, pending?.operand ?? value, operation.operand)
    }
    default: return state
  }
}

export function calculatorKeyboardKey(key: string): CalculatorKey | null {
  if (/^[0-9+*/%=-]$/.test(key)) return key as CalculatorKey
  switch (key) {
    case ',':
    case '.': return '.'
    case 'Enter': return '='
    case 'Backspace': return 'backspace'
    case 'Delete': return 'CE'
    case 'Escape': return 'C'
    case 'F9': return 'sign'
    case '@': return 'sqrt'
    case 'r': return 'reciprocal'
    default: return null
  }
}
