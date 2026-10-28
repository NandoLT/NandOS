import styled from '@emotion/styled'
import { DEFAULT_PORTFOLIO_CONTENT } from '@nandoos/contracts'
import type { PortfolioSectionId } from '@nandoos/contracts'
import { usePortfolioContent } from '../application/usePortfolioContent'

type PortfolioSectionWindowProps = {
  sectionId: PortfolioSectionId
  onDownloadCv: (language: 'es' | 'en') => void
}

const Page = styled.div`
  display: grid;
  gap: 16px;
  color: var(--os-window-text);

  h2 {
    margin: 0 0 5px;
    font-size: 21px;
  }

  p {
    margin: 0;
    color: var(--os-muted);
    font-size: 13px;
    line-height: 1.55;
  }
`

const PageIntro = styled.header`
  display: grid;
  gap: 5px;
`

const Eyebrow = styled.div`
  color: var(--os-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const EntryList = styled.div`
  display: grid;
  gap: 12px;
`

const EntryCard = styled.article`
  display: grid;
  gap: 9px;
  padding: 14px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface);

  h3 {
    margin: 0;
    font-size: 15px;
  }

  ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.45;
  }
`

const EntryMeta = styled.div`
  color: var(--os-accent);
  font-size: 11px;
  font-weight: 700;
`

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Tag = styled.span`
  padding: 4px 7px;
  border: 1px solid var(--os-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-surface-alt);
  font-size: 11px;
`

const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const ContactList = styled.div`
  display: grid;
  gap: 8px;
`

const ContactLocation = styled.p`
  color: var(--os-window-text) !important;
  font-size: 12px !important;
  font-weight: 600;
`

const ContactRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 10px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface);

  a {
    color: var(--os-accent);
    font-size: 13px;
    font-weight: 700;
    text-decoration: underline;
  }

`

const DownloadActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
`

const DownloadButton = styled.button`
  padding: 7px 10px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  cursor: pointer;

  &:active { border-style: inset; }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`

const sectionTitles: Record<PortfolioSectionId, string> = {
  experience: 'Experiencia',
  projects: 'Proyectos',
  skills: 'Habilidades',
  contact: 'Contacto',
}

export function PortfolioSectionWindow({ sectionId, onDownloadCv }: PortfolioSectionWindowProps) {
  const { data = DEFAULT_PORTFOLIO_CONTENT } = usePortfolioContent()
  const page = data.sectionIntros[sectionId]

  return (
    <Page>
      <PageIntro>
        <Eyebrow>{page.eyebrow}</Eyebrow>
        <h2>{sectionTitles[sectionId]}</h2>
        <p>{page.description}</p>
      </PageIntro>

      {sectionId === 'experience' && (
        <EntryList>
          {data.experienceEntries.map((entry) => (
            <EntryCard key={entry.id}>
              <div>
                <h3>{entry.title}</h3>
                <EntryMeta>{entry.context}</EntryMeta>
              </div>
              <p>{entry.summary}</p>
              <ul>
                {entry.contributions.map((contribution) => <li key={contribution}>{contribution}</li>)}
              </ul>
            </EntryCard>
          ))}
        </EntryList>
      )}

      {sectionId === 'projects' && (
        <EntryList>
          {data.featuredProjects.map((project) => (
            <EntryCard key={project.id}>
              <div>
                <h3>{project.title}</h3>
                <EntryMeta>{project.details}</EntryMeta>
              </div>
              <p>{project.description}</p>
              <TagList>
                {project.technologies.map((technology) => <Tag key={technology}>{technology}</Tag>)}
              </TagList>
            </EntryCard>
          ))}
        </EntryList>
      )}

      {sectionId === 'skills' && (
        <SkillsGrid>
          {data.skillGroups.map((group) => (
            <EntryCard key={group.id}>
              <h3>{group.title}</h3>
              <TagList>
                {group.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
              </TagList>
            </EntryCard>
          ))}
        </SkillsGrid>
      )}

      {sectionId === 'contact' && (
        <>
          <ContactLocation>{data.contact.location} · {data.contact.availability}</ContactLocation>
          <ContactList aria-label="Canales de contacto">
            {data.contact.channels.map((channel) => (
              <ContactRow key={channel.id}>
                <span aria-hidden="true">{channel.icon}</span>
                <a
                  href={channel.href}
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                  rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={`${channel.label}: ${channel.value}`}
                >
                  {channel.value}
                </a>
              </ContactRow>
            ))}
          </ContactList>
          <DownloadActions aria-label="Descarga del CV">
            <DownloadButton type="button" onClick={() => onDownloadCv('es')}>
              📄 Descargar CV · Español
            </DownloadButton>
            <DownloadButton type="button" onClick={() => onDownloadCv('en')}>
              📄 Download CV · English
            </DownloadButton>
          </DownloadActions>
        </>
      )}
    </Page>
  )
}
