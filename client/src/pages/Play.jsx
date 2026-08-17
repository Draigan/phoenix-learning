import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function Play() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h1 className="text-4xl font-bold">Game</h1>
      <p className="text-muted-foreground">Game content goes here</p>
      <Button variant="outline" onClick={() => navigate('/')}>
        Back to Menu
      </Button>
    </div>
  )
}
