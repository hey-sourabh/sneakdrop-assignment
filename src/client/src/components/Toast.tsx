import type { ToastMessage } from '../types';

interface ToastProps {
  message: ToastMessage | null;
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className={`toast toast-${message.type}`}>
      {message.text}
    </div>
  );
}
