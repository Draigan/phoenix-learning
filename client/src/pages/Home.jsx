import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center text-3xl">Phoenix Learning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button size="lg" onClick={() => navigate('/play')}>
            Play
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
