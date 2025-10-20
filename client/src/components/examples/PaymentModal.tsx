import { useState } from 'react'
import PaymentModal from '../PaymentModal'
import { Button } from '@/components/ui/button'

export default function PaymentModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Payment Modal</Button>
      <PaymentModal
        open={open}
        onClose={() => setOpen(false)}
        amount={0.15}
        recipient="0x742d35Cc6634C0532925a3b844Bc9e7595f38C4"
        onConfirm={() => console.log('Payment confirmed')}
      />
    </div>
  )
}
