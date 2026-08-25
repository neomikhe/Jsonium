import type { ConvertFormat, ConvertOutput } from '../core/convert';
import { CONVERT_PREVIEW_CHARS } from '../core/limits';
import { formatCount } from '../lib/format';

const FORMATS: readonly ConvertFormat[] = ['yaml', 'toml', 'csv'];

interface ConvertPanelProps {
  format: ConvertFormat;
  output: ConvertOutput | null;
  error: string | null;
  isRunning: boolean;
  onFormatChange: (format: ConvertFormat) => void;
  onCopy: (text: string) => void;
}

export function ConvertPanel(props: ConvertPanelProps) {
  const { format, output, error, isRunning, onFormatChange, onCopy } = props;

  return (
    <>
      <div className="convert__bar">
        {FORMATS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={candidate === format ? 'modes__button modes__button--active' : 'modes__button'}
            onClick={() => {
              onFormatChange(candidate);
            }}
          >
            {candidate.toUpperCase()}
          </button>
        ))}
        {output !== null && (
          <button
            type="button"
            className="convert__copy"
            onClick={() => {
              onCopy(output.text);
            }}
          >
            Copiar
          </button>
        )}
      </div>

      {error !== null && <p className="notice notice--error">{error}</p>}
      {isRunning && <p className="notice">Convirtiendo...</p>}
      {needsFailureNotice(output) && <p className="notice notice--error">{output?.failure}</p>}
      {output !== null && !isRunning && <ConvertOutputView output={output} />}
    </>
  );
}

function needsFailureNotice(output: ConvertOutput | null): boolean {
  return output !== null && output.failure !== null && output.losses.length === 0;
}

function ConvertOutputView({ output }: { output: ConvertOutput }) {
  const isTruncated = output.text.length > CONVERT_PREVIEW_CHARS;
  const preview = isTruncated ? output.text.slice(0, CONVERT_PREVIEW_CHARS) : output.text;

  return (
    <>
      {output.losses.length > 0 && (
        <div className="losses" role="status">
          <span className="losses__title">Esta conversion pierde informacion</span>
          <ul className="losses__list">
            {output.losses.map((loss) => (
              <li key={`${loss.kind}:${loss.path}`}>
                <span className="losses__path">{loss.path}</span> {loss.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isTruncated && (
        <p className="notice">
          Se muestran los primeros {formatCount(CONVERT_PREVIEW_CHARS)} caracteres. Copiar entrega el
          texto completo.
        </p>
      )}

      {output.text !== '' && <pre className="convert__output">{preview}</pre>}
    </>
  );
}
