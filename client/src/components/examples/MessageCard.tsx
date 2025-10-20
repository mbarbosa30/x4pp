import MessageCard from '../MessageCard'

export default function MessageCardExample() {
  return (
    <div className="space-y-3 max-w-2xl">
      <MessageCard
        id="1"
        senderAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f38C4"
        senderVerified={true}
        messagePreview="Hey! I'd love to collaborate on your latest project..."
        amount={0.15}
        timeRemaining="2h 45m"
        opened={false}
        onClick={() => console.log('Message 1 clicked')}
      />
      <MessageCard
        id="2"
        senderAddress="0x8B3f9eA2c4B7d6A5F1E0a3B9C8D7E6F5A4B3C2D1"
        senderVerified={false}
        messagePreview="Quick question about your availability next week"
        amount={0.05}
        timeRemaining="5h 12m"
        opened={true}
        onClick={() => console.log('Message 2 clicked')}
      />
    </div>
  )
}
