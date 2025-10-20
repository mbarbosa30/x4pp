import { useState } from 'react'
import VerificationModal from '../VerificationModal'
import { Button } from '@/components/ui/button'

export default function VerificationModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Verification Modal</Button>
      <VerificationModal
        open={open}
        onClose={() => setOpen(false)}
        onVerified={() => console.log('User verified!')}
      />
    </div>
  )
}
