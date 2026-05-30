import { CornerDownLeft, TerminalSquare, X } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';

interface CommandInputProps {
  disabled?: boolean;
  onSend(command: string): Promise<void>;
}

export function CommandInput({ disabled, onSend }: CommandInputProps) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const send = async () => {
    const command = value.trim();
    if (!command || disabled) {
      return;
    }
    await onSend(command);
    setHistory((items) => [command, ...items.filter((item) => item !== command)].slice(0, 50));
    setValue('');
    setHistoryIndex(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void send();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = historyIndex === null ? 0 : Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIndex);
      setValue(history[nextIndex] ?? value);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === null) {
        return;
      }
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex >= 0 ? nextIndex : null);
      setValue(nextIndex >= 0 ? history[nextIndex] : '');
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
      <TerminalSquare size={18} className="text-slate-500" />
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        placeholder="输入命令按回车发送，使用上下键选择历史命令"
      />
      {value && (
        <button type="button" className="square-button h-8 w-8" onClick={() => setValue('')} aria-label="清空输入">
          <X size={15} />
        </button>
      )}
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || !value.trim()}
        onClick={() => void send()}
      >
        <CornerDownLeft size={15} />
        发送
      </button>
    </div>
  );
}
