import AttentionSlots from '../AttentionSlots'

export default function AttentionSlotsExample() {
  return (
    <div className="space-y-4">
      <AttentionSlots totalSlots={5} usedSlots={3} timeWindow="hour" />
      <AttentionSlots totalSlots={10} usedSlots={7} timeWindow="day" />
    </div>
  )
}
