import { beforeEach, describe, expect, it } from 'vitest'
import type { GraphNode } from '@/lib/graph/types'
import { useGraphStore } from '@/store/graphStore'

function person(id: string, label: string, subtitle: string): GraphNode {
  return {
    id,
    type: 'person',
    label,
    subtitle,
    description: '',
    color: '',
    mark: '',
    x: 0,
    y: 0,
  }
}

beforeEach(() => {
  useGraphStore.setState({
    nodesMap: {},
    edges: [],
    draftNodes: [],
    draftEdges: [],
    suggestedEdges: [],
    selectedId: null,
    activeView: 'GRAPH',
    focalPersonId: null,
    toast: null,
  })
})

describe('activeView / focalPersonId', () => {
  it('refuses to enter Tree View when no persons exist', () => {
    const { setActiveView } = useGraphStore.getState()
    setActiveView('TREE')
    expect(useGraphStore.getState().activeView).toBe('GRAPH')
  })

  it('auto-picks the earliest-born person when nothing is selected', () => {
    useGraphStore.setState({
      nodesMap: {
        young: person('young', 'Young', 'b. 1935'),
        old: person('old', 'Old', '1898–1978 · miller'),
      },
    })
    const { setActiveView } = useGraphStore.getState()
    setActiveView('TREE')
    const s = useGraphStore.getState()
    expect(s.activeView).toBe('TREE')
    expect(s.focalPersonId).toBe('old')
    expect(s.toast?.message).toBe('Showing ancestral tree of Old')
  })

  it('uses the selected person as the focal when present', () => {
    useGraphStore.setState({
      nodesMap: {
        young: person('young', 'Young', 'b. 1935'),
        old: person('old', 'Old', '1898–1978 · miller'),
      },
      selectedId: 'young',
    })
    const { setActiveView } = useGraphStore.getState()
    setActiveView('TREE')
    expect(useGraphStore.getState().focalPersonId).toBe('young')
  })

  it('returns to GRAPH while keeping the focal', () => {
    useGraphStore.setState({
      nodesMap: { old: person('old', 'Old', '1898–1978') },
    })
    const { setActiveView } = useGraphStore.getState()
    setActiveView('TREE')
    setActiveView('GRAPH')
    const s = useGraphStore.getState()
    expect(s.activeView).toBe('GRAPH')
    expect(s.focalPersonId).toBe('old')
  })

  it('is idempotent when already in the requested view', () => {
    useGraphStore.setState({
      nodesMap: { old: person('old', 'Old', '1898–1978') },
      activeView: 'TREE',
      focalPersonId: 'old',
      toast: null,
    })
    const { setActiveView } = useGraphStore.getState()
    setActiveView('TREE')
    expect(useGraphStore.getState().toast).toBeNull()
  })

  it('setFocalPersonId sets the focal directly', () => {
    const { setFocalPersonId } = useGraphStore.getState()
    setFocalPersonId('some-person')
    expect(useGraphStore.getState().focalPersonId).toBe('some-person')
    setFocalPersonId(null)
    expect(useGraphStore.getState().focalPersonId).toBeNull()
  })
})
