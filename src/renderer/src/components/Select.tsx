import { Children, Fragment, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

/** Même forme d'événement que le <select> natif : les appels existants (e.target.value) restent valables. */
export type SelectChange = { target: { value: string } }

type Opt = { value: string; label: string; disabled: boolean; group?: string }

type Props = {
  value: string
  onChange: (e: SelectChange) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  title?: string
  style?: CSSProperties
  'aria-label'?: string
}

const text = (n: ReactNode): string => {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(text).join('')
  if (isValidElement(n)) return text((n.props as { children?: ReactNode }).children)
  return ''
}

/** Lit les <option> et <optgroup> passés en enfants, comme le ferait le navigateur. */
function collect(children: ReactNode, group?: string, out: Opt[] = []): Opt[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    const p = c.props as { children?: ReactNode; value?: string | number; label?: string; disabled?: boolean }
    if (c.type === 'optgroup') collect(p.children, p.label, out)
    else if (c.type === 'option') {
      const label = text(p.children)
      out.push({ value: p.value !== undefined ? String(p.value) : label, label, disabled: !!p.disabled, group })
    } else if (c.type === Fragment) collect(p.children, group, out)
  })
  return out
}

/** « Vitrine · visuel » : le nom en clair, la précision en discret à droite. */
function Label({ label }: { label: string }) {
  const i = label.indexOf(' · ')
  if (i < 0) return <span className="ui-select-main">{label}</span>
  return (
    <>
      <span className="ui-select-main">{label.slice(0, i)}</span>
      <span className="ui-select-hint">{label.slice(i + 3)}</span>
    </>
  )
}

/** Menu déroulant aux couleurs de l'app (remplace la liste native de Windows). */
export function Select({ value, onChange, children, className = '', disabled, title, style, ...rest }: Props) {
  const opts = useMemo(() => collect(children), [children])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState<CSSProperties>({})
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const typed = useRef({ s: '', t: 0 })
  const current = opts.find((o) => o.value === value) ?? opts[0]

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const want = Math.min(340, opts.length * 36 + 12 + new Set(opts.map((o) => o.group).filter(Boolean)).size * 30)
    const up = below < want && above > below
    const width = Math.max(r.width, 220)
    const left = Math.min(r.left, window.innerWidth - width - 8)
    setPos({ left, width, maxHeight: Math.min(340, up ? above : below), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) })
  }

  const show = () => {
    if (disabled || !opts.length) return
    place()
    setActive(Math.max(0, opts.indexOf(current)))
    setOpen(true)
  }
  const pick = (o: Opt) => {
    if (o.disabled) return
    setOpen(false)
    btn.current?.focus()
    if (o.value !== value) onChange({ target: { value: o.value } })
  }
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < opts.length; i += dir) if (!opts[i].disabled) return i
    return from
  }

  // Fermeture : clic ailleurs, défilement de la page, fenêtre redimensionnée.
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => !btn.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node) && setOpen(false)
    const scroll = (e: Event) => !pop.current?.contains(e.target as Node) && setOpen(false)
    const resize = () => setOpen(false)
    document.addEventListener('mousedown', down)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('mousedown', down)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', resize)
    }
  }, [open])

  // À l'ouverture, l'option choisie est centrée ; ensuite, la liste suit le clavier au plus court.
  const opened = useRef(false)
  useLayoutEffect(() => {
    if (!open) return void (opened.current = false)
    if (active >= 0) pop.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: opened.current ? 'nearest' : 'center' })
    opened.current = true
  }, [open, active])

  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => step(a, e.key === 'ArrowDown' ? 1 : -1))
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      setActive(e.key === 'Home' ? step(-1, 1) : step(opts.length, -1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (opts[active]) pick(opts[active])
    } else if (e.key.length === 1) {
      // Saisie au clavier : saute à l'option qui commence par les lettres tapées.
      const now = Date.now()
      typed.current = { s: (now - typed.current.t < 700 ? typed.current.s : '') + e.key.toLowerCase(), t: now }
      const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      const i = opts.findIndex((o) => !o.disabled && norm(o.label).startsWith(norm(typed.current.s)))
      if (i >= 0) setActive(i)
    }
  }

  let lastGroup: string | undefined
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`ui-select ${className} ${open ? 'open' : ''} ${current && current.value === '' ? 'placeholder' : ''}`}
        disabled={disabled}
        title={title}
        style={style}
        aria-label={rest['aria-label']}
        data-value={value}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        <span className="ui-select-value">{current ? <Label label={current.label} /> : null}</span>
        <ChevronDown size={14} className="ui-select-chevron" />
      </button>
      {open &&
        createPortal(
          <div ref={pop} className="ui-select-pop" role="listbox" style={pos} onMouseDown={(e) => e.preventDefault()}>
            {opts.map((o, i) => {
              const head = o.group && o.group !== lastGroup ? o.group : undefined
              lastGroup = o.group
              return (
                <Fragment key={i}>
                  {head && <div className="ui-select-group">{head}</div>}
                  <div
                    data-i={i}
                    data-value={o.value}
                    role="option"
                    aria-selected={o.value === value}
                    aria-disabled={o.disabled}
                    className={`ui-select-opt ${i === active ? 'active' : ''} ${o.value === value ? 'on' : ''} ${o.disabled ? 'disabled' : ''}`}
                    onMouseEnter={() => !o.disabled && setActive(i)}
                    onClick={() => pick(o)}
                  >
                    <Label label={o.label} />
                    {o.value === value && <Check size={14} className="ui-select-check" />}
                  </div>
                </Fragment>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}
