import { useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'
import Spelling from '../pages/Spelling'
import Math from '../pages/Math'
import Settings from '../pages/Settings'
import Test from '../pages/Test'

const TABS = [
  { path: '/spelling',  Component: Spelling  },
  { path: '/math',      Component: Math      },
  { path: '/test',      Component: Test      },
  { path: '/settings',  Component: Settings  },
]

export default function GameLayout() {
  const { pathname } = useLocation()
  const active = TABS.find(t => t.path === pathname)

  return (
    <div className="flex flex-col h-full w-full">
      <main className="flex-1 overflow-hidden relative">
        {active && (
          <div key={active.path} className="absolute inset-0 overflow-hidden">
            <active.Component />
          </div>
        )}
      </main>
      <TabBar />
    </div>
  )
}
