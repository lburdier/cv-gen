import type { ReactNode } from 'react'
import { SECTION_TITLES } from '../../../shared/format'
import type { DesignSpec, SectionKey } from '../../../shared/types'

type Opt<T extends string> = [T, string][]

function Seg<T extends string>({ value, options, onChange }: { value: T; options: Opt<T>; onChange: (v: T) => void }) {
  return (
    <div className="seg seg-wrap">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="field">
    <span>{label}</span>
    {children}
  </div>
)

const SIDE_SECTIONS: SectionKey[] = ['summary', 'skills', 'languages', 'interests', 'certifications', 'education', 'projects']

const COLOR_LABELS: [keyof DesignSpec['colors'], string][] = [
  ['primary', 'Accent principal'],
  ['secondary', 'Accent secondaire'],
  ['page', 'Fond de page'],
  ['text', 'Texte'],
  ['sidebar', 'Colonne latérale'],
  ['header', 'En-tête']
]

/** Réglages du modèle « Sur mesure » : chaque paramètre du design se règle à la main. */
export function DesignForm({ design: d, onChange }: { design: DesignSpec; onChange: (d: DesignSpec) => void }) {
  const set = <K extends keyof DesignSpec>(k: K, v: DesignSpec[K]) => onChange({ ...d, [k]: v })
  const hasSide = d.layout !== 'single'
  return (
    <div className="design-form stack" style={{ gap: 14 }}>
      <Row label="Mise en page">
        <Seg
          value={d.layout}
          options={[
            ['single', 'Une colonne'],
            ['sidebar-left', 'Colonne à gauche'],
            ['sidebar-right', 'Colonne à droite']
          ]}
          onChange={(v) =>
            onChange({ ...d, layout: v, sidebarSections: v !== 'single' && !d.sidebarSections.length ? ['skills', 'languages', 'interests', 'certifications'] : d.sidebarSections })
          }
        />
      </Row>
      {hasSide && (
        <Row label={`Largeur de la colonne : ${d.sidebarWidth} %`}>
          <input type="range" className="range" min={24} max={42} value={d.sidebarWidth} onChange={(e) => set('sidebarWidth', Number(e.target.value))} />
        </Row>
      )}
      <Row label="En-tête">
        <Seg
          value={d.header}
          options={[
            ['band', 'Bandeau'],
            ['card', 'Bloc'],
            ['minimal', 'Minimal'],
            ['split', 'Scindé']
          ]}
          onChange={(v) => set('header', v)}
        />
        <Seg
          value={d.headerAlign}
          options={[
            ['left', 'Aligné à gauche'],
            ['center', 'Centré']
          ]}
          onChange={(v) => set('headerAlign', v)}
        />
      </Row>
      <Row label="Photo">
        <Seg
          value={d.photo}
          options={[
            ['none', 'Aucune'],
            ['circle', 'Ronde'],
            ['rounded', 'Arrondie'],
            ['square', 'Carrée']
          ]}
          onChange={(v) => set('photo', v)}
        />
        {d.photo !== 'none' && (!hasSide || d.photoPlace === 'header') && (
          <Seg
            value={d.photoSide}
            options={[
              ['left', 'À gauche'],
              ['right', 'À droite']
            ]}
            onChange={(v) => set('photoSide', v)}
          />
        )}
        {hasSide && d.photo !== 'none' && (
          <Seg
            value={d.photoPlace}
            options={[
              ['header', 'Dans l’en-tête'],
              ['sidebar', 'Dans la colonne']
            ]}
            onChange={(v) => set('photoPlace', v)}
          />
        )}
      </Row>
      <Row label="Titres de section">
        <Seg
          value={d.headings}
          options={[
            ['underline', 'Soulignés'],
            ['pill', 'Pastille'],
            ['block', 'Bande'],
            ['caps', 'Capitales'],
            ['highlight', 'Surlignés'],
            ['bar', 'Barre']
          ]}
          onChange={(v) => set('headings', v)}
        />
      </Row>
      <Row label="Polices (texte · nom et titres)">
        <Seg
          value={d.bodyFont}
          options={[
            ['sans', 'Sans'],
            ['serif', 'Serif'],
            ['mono', 'Mono']
          ]}
          onChange={(v) => set('bodyFont', v)}
        />
        <Seg
          value={d.displayFont}
          options={[
            ['sans', 'Sans'],
            ['serif', 'Serif'],
            ['mono', 'Mono'],
            ['wide', 'Large']
          ]}
          onChange={(v) => set('displayFont', v)}
        />
      </Row>
      <Row label="Nom">
        <Seg
          value={d.nameSize}
          options={[
            ['m', 'Moyen'],
            ['l', 'Grand'],
            ['xl', 'Très grand']
          ]}
          onChange={(v) => set('nameSize', v)}
        />
        <Seg
          value={d.nameCase}
          options={[
            ['normal', 'Casse normale'],
            ['upper', 'Capitales']
          ]}
          onChange={(v) => set('nameCase', v)}
        />
      </Row>
      <Row label="Compétences et parcours">
        <Seg
          value={d.skills}
          options={[
            ['chips', 'Pastilles'],
            ['columns', 'Colonnes'],
            ['list', 'Texte']
          ]}
          onChange={(v) => set('skills', v)}
        />
        <Seg
          value={d.timeline ? 'on' : 'off'}
          options={[
            ['on', 'Frise'],
            ['off', 'Sans frise']
          ]}
          onChange={(v) => set('timeline', v === 'on')}
        />
      </Row>
      <Row label="Finitions">
        <Seg
          value={d.corners}
          options={[
            ['rounded', 'Angles arrondis'],
            ['square', 'Angles droits']
          ]}
          onChange={(v) => set('corners', v)}
        />
        <Seg
          value={d.density}
          options={[
            ['airy', 'Aéré'],
            ['compact', 'Dense']
          ]}
          onChange={(v) => set('density', v)}
        />
      </Row>
      <Row label="Décor (en-tête ou colonne)">
        <Seg
          value={d.decor ?? 'none'}
          options={[
            ['none', 'Aucun'],
            ['dots', 'Points'],
            ['grid', 'Quadrillage'],
            ['lines', 'Lignes'],
            ['diagonal', 'Rayures'],
            ['waves', 'Vagues'],
            ['circles', 'Cercles'],
            ['blobs', 'Formes'],
            ['confetti', 'Confettis']
          ]}
          onChange={(v) => set('decor', v)}
        />
      </Row>
      {d.header === 'band' && (
        <Row label="Bord du bandeau">
          <Seg
            value={d.headerShape ?? 'flat'}
            options={[
              ['flat', 'Droit'],
              ['curve', 'Arrondi'],
              ['slant', 'En biais'],
              ['wave', 'Vague']
            ]}
            onChange={(v) => set('headerShape', v)}
          />
        </Row>
      )}
      <Row label="Style du nom">
        <Seg
          value={d.nameStyle ?? 'accent'}
          options={[
            ['accent', 'Nom en couleur'],
            ['plain', 'Uni'],
            ['highlight', 'Surligné'],
            ['outline', 'Contour'],
            ['gradient', 'Dégradé']
          ]}
          onChange={(v) => set('nameStyle', v)}
        />
      </Row>
      <Row label="Puces et parcours">
        <Seg
          value={d.bullets ?? 'dot'}
          options={[
            ['dot', '•'],
            ['dash', '–'],
            ['arrow', '›'],
            ['square', '■'],
            ['check', '✓']
          ]}
          onChange={(v) => set('bullets', v)}
        />
        <Seg
          value={d.entries ?? 'plain'}
          options={[
            ['plain', 'Expériences simples'],
            ['cards', 'En cartes'],
            ['rule', 'Avec filet']
          ]}
          onChange={(v) => set('entries', v)}
        />
      </Row>
      <Row label="Liseré de page">
        <Seg
          value={d.frame ?? 'none'}
          options={[
            ['none', 'Aucun'],
            ['top', 'En haut'],
            ['side', 'Sur le côté'],
            ['border', 'Cadre']
          ]}
          onChange={(v) => set('frame', v)}
        />
      </Row>
      <Row label="Couleurs">
        <div className="design-colors">
          {COLOR_LABELS.filter(([k]) => hasSide || k !== 'sidebar').map(([k, label]) => (
            <label key={k} className="design-color">
              <input type="color" value={d.colors[k]} onChange={(e) => onChange({ ...d, colors: { ...d.colors, [k]: e.target.value.toUpperCase() } })} />
              <span>
                {label}
                <small>{d.colors[k]}</small>
              </span>
            </label>
          ))}
        </div>
      </Row>
      {hasSide && (
        <Row label="Sections dans la colonne">
          <div className="design-checks">
            {SIDE_SECTIONS.map((k) => (
              <label key={k} className="check">
                <input
                  type="checkbox"
                  checked={d.sidebarSections.includes(k)}
                  onChange={(e) => set('sidebarSections', e.target.checked ? [...d.sidebarSections, k] : d.sidebarSections.filter((x) => x !== k))}
                />
                {SECTION_TITLES.fr[k]}
              </label>
            ))}
          </div>
        </Row>
      )}
    </div>
  )
}
