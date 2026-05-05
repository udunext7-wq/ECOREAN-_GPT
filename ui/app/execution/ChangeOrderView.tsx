type Props = {
  onCreate: () => void;
};

export function ChangeOrderView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>추가공사 승인</h5>
      <p>추가 금액과 추가 원가를 PCE로 검증하고 저마진 추가공사를 차단합니다.</p>
      <button onClick={onCreate}>추가공사 요청</button>
    </div>
  );
}
