import VerificationBadge from '../VerificationBadge'

export default function VerificationBadgeExample() {
  return (
    <div className="flex gap-4 items-center">
      <VerificationBadge verified={true} size="sm" />
      <VerificationBadge verified={true} size="md" />
      <VerificationBadge verified={true} size="lg" />
    </div>
  )
}
