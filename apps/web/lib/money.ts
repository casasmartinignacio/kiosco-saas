export function money(value: number) {
  return '₡' + value.toLocaleString('en-US')
}
