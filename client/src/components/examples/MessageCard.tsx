import MessageCard from '../MessageCard'

export default function MessageCardExample() {
  return (
    <div className="space-y-3 max-w-2xl">
      <MessageCard
        id="1"
        senderName="Sarah Chen"
        senderVerified={true}
        messagePreview="Hey! I'd love to collaborate on your latest project..."
        amount={0.15}
        timeRemaining="2h 45m"
        opened={false}
        onClick={() => console.log('Message 1 clicked')}
      />
      <MessageCard
        id="2"
        senderName="Alex Rivera"
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
