import { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container mx-auto p-8">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">shadcn/ui Components</h1>
          <p className="text-muted-foreground">Testing button and card components with proper styling</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Counter Example</CardTitle>
            <CardDescription>Click the button to increment the counter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={() => setCount((count) => count + 1)}>
                Count is {count}
              </Button>
              <Button variant="secondary" onClick={() => setCount(0)}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>Different button styles available in shadcn/ui</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>Different button sizes available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">All buttons are properly styled with Tailwind CSS</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default App
