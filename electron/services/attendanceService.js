function calculateWorkHours(checkInTime = '08:00', checkOutTime = '17:00') {
  const [inHour, inMinute] = String(checkInTime).split(':').map(Number);
  const [outHour, outMinute] = String(checkOutTime).split(':').map(Number);
  const start = (Number.isFinite(inHour) ? inHour : 8) * 60 + (Number.isFinite(inMinute) ? inMinute : 0);
  const end = (Number.isFinite(outHour) ? outHour : 17) * 60 + (Number.isFinite(outMinute) ? outMinute : 0);
  return Math.max(0, Number(((end - start) / 60).toFixed(2)));
}

function buildAttendanceRows({ projectId, siteNameKo = '현장', workDate, workers = [] }) {
  const date = workDate || new Date().toISOString().slice(0, 10);
  return workers.map((worker, index) => {
    const workHours = calculateWorkHours(worker.checkInTime, worker.checkOutTime);
    const dailyWage = Math.max(0, Math.round(Number(worker.dailyWage || 0)));
    const laborCost = Math.round(dailyWage * (workHours / 8));
    return {
      projectId,
      siteNameKo,
      workDate: date,
      workerNameKo: worker.workerNameKo || `작업자 ${index + 1}`,
      roleKo: worker.roleKo || '기공',
      affiliationKo: worker.affiliationKo || '직영/외주 미확정',
      checkInTime: worker.checkInTime || '08:00',
      checkOutTime: worker.checkOutTime || '17:00',
      workHours,
      dailyWage,
      laborCost,
      notesKo: worker.notesKo || ''
    };
  });
}

module.exports = {
  buildAttendanceRows,
  calculateWorkHours
};
