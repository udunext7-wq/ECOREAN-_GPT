import { formatWon } from '../../services/finance-service/financeService';

type Props = {
  forecasts: Array<Record<string, unknown>>;
};

export function CashflowForecastView({ forecasts }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>현금흐름 예측</h5>
      {forecasts.map((forecast) => (
        <div className={forecast.shortageRisk ? 'case-row warning-row' : 'case-row'} key={String(forecast.forecastId)}>
          <strong>{String(forecast.forecastDate)} / {String(forecast.cashflowType)}</strong>
          <span>{formatWon(forecast.amount)}</span>
          <p>
            {String(forecast.notesKo)} / 잔액 예측 {formatWon(forecast.runningBalance)}
            {forecast.shortageRisk ? ' / RED ALERT: 자금 부족 예상' : ''}
          </p>
        </div>
      ))}
    </div>
  );
}
