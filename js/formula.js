function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 원소기호/괄호 뒤에 붙는 숫자를 아래첨자로. 계수(앞자리 숫자)는 문자 뒤가 아니므로 유지.
export function renderFormula(text) {
  let s = escapeHtml(String(text));
  s = s.replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>").replace(/\^(\w)/g, "<sup>$1</sup>");
  s = s.replace(/([A-Za-z\)])(\d+)/g, "$1<sub>$2</sub>");
  return s;
}
