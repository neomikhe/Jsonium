import type { ConvertOutput } from '../core/convert';
import type { OutputFormat } from '../lib/use-convert';
import { CONVERT_PREVIEW_CHARS } from '../core/limits';
import { formatCount } from '../lib/format';
import { useMessages } from '../lib/i18n';
import { describeFailure } from '../lib/describe-failure';

const DATA_FORMATS: readonly OutputFormat[] = ['yaml', 'toml', 'csv', 'schema', 'mock'];
const CODE_FORMATS: readonly OutputFormat[] = ['typescript', 'go', 'python', 'rust'];
const LABELS: Record<string, string> = {
  yaml: 'YAML',
  toml: 'TOML',
  csv: 'CSV',
  schema: 'SCHEMA',
  mock: 'MOCK',
  typescript: 'TS',
  go: 'Go',
  python: 'Python',
  rust: 'Rust',
};

interface ConvertPanelProps {
  format: OutputFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  onFormatChange: (format: OutputFormat) => void;
  onCopy: (text: string) => void;
  onDownload: (text: string, format: OutputFormat) => void;
  mockCount: number;
  onMockCountChange: (count: number) => void;
}

export function ConvertPanel(props: ConvertPanelProps) {
  const { output, error, isRunning } = props;
  const messages = useMessages();

  return (
    <>
      <ConvertBar {...props} />
      {error !== null && <p className="notice notice--error">{describeFailure(messages, error)}</p>}
      {isRunning && <p className="notice">{messages.converting}</p>}
      {needsFailureNotice(output) && (
        <p className="notice notice--error">{describeFailure(messages, output?.failure ?? '')}</p>
      )}
      {output !== null && !isRunning && <ConvertOutputView output={output} />}
    </>
  );
}

function ConvertBar(props: ConvertPanelProps) {
  const { format, output, onFormatChange, onCopy, onDownload, mockCount, onMockCountChange } =
    props;
  const messages = useMessages();
  const text = output?.text ?? '';

  return (
    <div className="convert__bar">
      {[...DATA_FORMATS, ...CODE_FORMATS].map((candidate) => (
        <button
          key={candidate}
          type="button"
          className={candidate === format ? 'modes__button modes__button--active' : 'modes__button'}
          onClick={() => {
            onFormatChange(candidate);
          }}
        >
          {LABELS[candidate] ?? candidate}
        </button>
      ))}
      {format === 'mock' && <MockCount value={mockCount} onChange={onMockCountChange} />}
      {text !== '' && (
        <>
          <button
            type="button"
            className="convert__copy"
            onClick={() => {
              onCopy(text);
            }}
          >
            {messages.copy}
          </button>
          <button
            type="button"
            className="convert__copy"
            onClick={() => {
              onDownload(text, format);
            }}
          >
            {messages.download}
          </button>
        </>
      )}
    </div>
  );
}

function needsFailureNotice(output: ConvertOutput | null): boolean {
  return output !== null && output.failure !== null && output.losses.length === 0;
}

function ConvertOutputView({ output }: { output: ConvertOutput }) {
  const messages = useMessages();
  const isTruncated = output.text.length > CONVERT_PREVIEW_CHARS;
  const preview = isTruncated ? output.text.slice(0, CONVERT_PREVIEW_CHARS) : output.text;

  return (
    <>
      {output.losses.length > 0 && (
        <div className="losses" role="status">
          <span className="losses__title">{messages.lossTitle}</span>
          <ul className="losses__list">
            {output.losses.map((loss) => (
              <li key={`${loss.kind}:${loss.path}`}>
                <span className="losses__path">{loss.path}</span> {messages.loss[loss.kind]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isTruncated && (
        <p className="notice">{messages.truncatedPreview(formatCount(CONVERT_PREVIEW_CHARS))}</p>
      )}

      {output.text !== '' && <pre className="convert__output">{preview}</pre>}
    </>
  );
}

function MockCount({ value, onChange }: { value: number; onChange: (count: number) => void }) {
  const messages = useMessages();

  return (
    <label className="diff__key">
      {messages.howMany}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}
