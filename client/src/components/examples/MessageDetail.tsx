import MessageDetail from '../MessageDetail'

export default function MessageDetailExample() {
  return (
    <div className="max-w-3xl">
      <MessageDetail
        senderAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f38C4"
        senderVerified={true}
        message="Hey! I'd love to collaborate on your latest project. I've been following your work for a while and think we could build something amazing together. Let me know if you're interested in chatting more about this."
        amount={0.15}
        timestamp="2 hours ago"
        replyBounty={0.05}
        onReply={(msg) => console.log('Reply:', msg)}
        onBlock={() => console.log('Block sender')}
        onReport={() => console.log('Report message')}
      />
    </div>
  )
}
