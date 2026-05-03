type Props = {
  clients: Array<Record<string, unknown>>;
};

export function ClientDetailView({ clients }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>Client Master</h5>
      {clients.map((client) => (
        <div className="case-row" key={String(client.clientId)}>
          <strong>{String(client.customerNameKo)}</strong>
          <span>{String(client.contactPhone)}</span>
          <p>{String(client.siteAddressKo)}</p>
          <p>Lead: {String(client.leadId || '직접 등록')}</p>
        </div>
      ))}
    </div>
  );
}
