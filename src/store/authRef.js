let _uid = null
export const authRef = {
  get uid() { return _uid },
  set uid(v) { _uid = v }
}
