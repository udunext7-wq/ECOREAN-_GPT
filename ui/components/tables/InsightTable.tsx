import type { VarianceItem } from '../../src/types/dashboard';

type Props = {
  title: string;
  items: VarianceItem[];
};

export function InsightTable({ title, items }: Props) {
  return (
    <div className="insight-table">
      <h3>{title}</h3>
      {items.map((item) => (
        <div key={`${title}-${item.rank}`} className="insight-row">
          <span className="rank">{item.rank}</span>
          <div>
            <strong>{item.itemNameKo}</strong>
            <p>{item.reasonKo}</p>
          </div>
          <span>{item.actionKo}</span>
        </div>
      ))}
    </div>
  );
}
