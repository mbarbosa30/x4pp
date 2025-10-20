import ComposeMessage from '../ComposeMessage'

export default function ComposeMessageExample() {
  return (
    <div className="max-w-3xl">
      <ComposeMessage 
        isVerified={false}
        onSend={(recipient, message, bounty) => {
          console.log('Sending:', { recipient, message, bounty });
        }}
      />
    </div>
  )
}
