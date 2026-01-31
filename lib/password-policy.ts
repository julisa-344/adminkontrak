/**
 * Política de contraseña estricta para el panel de administración.
 * - Mínimo 8 caracteres
 * - Alfanumérico (letras y números)
 * - Al menos una mayúscula, una minúscula y un número
 * - No secuencias consecutivas (123, abc, 321, cba)
 * - No más de 2 caracteres repetidos seguidos (evita aaa, 111)
 */

const MIN_LENGTH = 8
const MAX_CONSECUTIVE_REPEAT = 2

function hasConsecutiveSequence(s: string, length: number = 3): boolean {
  const lower = s.toLowerCase()
  for (let i = 0; i <= lower.length - length; i++) {
    let ascending = true
    let descending = true
    for (let j = 0; j < length - 1; j++) {
      const a = lower.charCodeAt(i + j)
      const b = lower.charCodeAt(i + j + 1)
      if (b !== a + 1) ascending = false
      if (b !== a - 1) descending = false
    }
    if (ascending || descending) return true
  }
  return false
}

function hasRepeatedChars(s: string, maxRepeat: number): boolean {
  let count = 1
  for (let i = 1; i < s.length; i++) {
    if (s[i].toLowerCase() === s[i - 1].toLowerCase()) {
      count++
      if (count > maxRepeat) return true
    } else {
      count = 1
    }
  }
  return false
}

export type PasswordPolicyResult = { valid: true } | { valid: false; error: string }

export function validateAdminPassword(password: string): PasswordPolicyResult {
  if (password.length < MIN_LENGTH) {
    return { valid: false, error: `Mínimo ${MIN_LENGTH} caracteres` }
  }
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return { valid: false, error: "Solo letras y números (alfanumérico)" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Al menos una mayúscula" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Al menos una minúscula" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Al menos un número" }
  }
  if (hasConsecutiveSequence(password)) {
    return { valid: false, error: "No usar secuencias consecutivas (ej. 123, abc, 321)" }
  }
  if (hasRepeatedChars(password, MAX_CONSECUTIVE_REPEAT)) {
    return { valid: false, error: "No repetir el mismo carácter más de 2 veces seguidas" }
  }
  return { valid: true }
}

/** Mensajes para mostrar en el formulario de login del admin */
export const PASSWORD_POLICY_HINT =
  "Mín. 8 caracteres, alfanumérico, mayúscula, minúscula y número. Sin secuencias (123, abc) ni caracteres repetidos (aaa)."
