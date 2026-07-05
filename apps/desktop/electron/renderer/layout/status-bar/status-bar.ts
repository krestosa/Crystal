export function setRuntimeStatus(message: string): void {
  const status = document.querySelector<HTMLElement>("[data-crystal-runtime-status]");
  if (status) {
    status.textContent = message;
  }
}
