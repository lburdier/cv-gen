/**
 * Base d'entreprises connues : nom affiché | domaine officiel | variantes (séparées par « ; »).
 * Sert à afficher automatiquement le logo (favicon du site) dans le suivi des candidatures.
 * Les icônes sont lues sur le site de l'entreprise lui-même, puis gardées en cache sur l'ordinateur.
 */
const RAW = `
Accenture|accenture.com
Accor|group.accor.com|groupe accor
Adobe|adobe.com
Aéroports de Paris|parisaeroport.fr|adp;groupe adp
Air France|airfrance.fr|air france-klm;air france klm
Air Liquide|airliquide.com
Airbnb|airbnb.com
Airbus|airbus.com
Alan|alan.com
Alstom|alstom.com
Amazon|amazon.com|amazon france;aws;amazon web services
AMD|amd.com
Ankama|ankama.com
Apple|apple.com
Arkane Studios|arkane-studios.com|arkane;arkane lyon
ArcelorMittal|arcelormittal.com
Arkema|arkema.com
Atos|atos.net
Auchan|auchan.fr
Autodesk|autodesk.com
AXA|axa.com|axa france
Back Market|backmarket.fr|backmarket
Bandai Namco|bandainamcoent.com|bandai namco entertainment
Banque de France|banque-france.fr
Banque Populaire|banquepopulaire.fr
BlaBlaCar|blablacar.fr
Blizzard Entertainment|blizzard.com|blizzard;activision blizzard
BNP Paribas|group.bnpparibas|bnp
Boiron|boiron.fr
Bolloré|bollore.com|groupe bolloré
Bouygues|bouygues.com|groupe bouygues
Bouygues Construction|bouygues-construction.com
Bouygues Telecom|bouyguestelecom.fr
Bpifrance|bpifrance.fr|bpi
Bureau Veritas|bureauveritas.com
Canal+|canalplus.com|canal plus;groupe canal+
Capgemini|capgemini.com
Carrefour|carrefour.com|groupe carrefour
Cdiscount|cdiscount.com
CD Projekt Red|cdprojektred.com|cd projekt
Cegid|cegid.com
Celio|celio.com
Cerema|cerema.fr
CGI|cgi.com
Chanel|chanel.com
CIC|cic.fr
Cisco|cisco.com
Clarins|clarins.com
CMA CGM|cma-cgm.com
CNES|cnes.fr
CNRS|cnrs.fr
Coca-Cola|coca-colacompany.com|coca cola
Crédit Agricole|credit-agricole.com|credit agricole
Crédit Mutuel|creditmutuel.fr|credit mutuel
Criteo|criteo.com
Dailymotion|dailymotion.com
Danone|danone.com
Dassault Aviation|dassault-aviation.com
Dassault Systèmes|3ds.com|dassault systemes;3ds
Davidson Consulting|davidson.fr
Decathlon|decathlon.fr|decathlon france
Deezer|deezer.com
Deloitte|deloitte.com
Dior|dior.com|christian dior
Disney|disney.com|the walt disney company;disneyland paris
Doctolib|doctolib.fr
Don't Nod|dont-nod.com|dontnod;dont nod
Ubisoft|ubisoft.com|ubisoft paris;ubisoft montpellier;ubisoft annecy;ubisoft bordeaux
EA|ea.com|electronic arts
EDF|edf.fr|électricité de france
Eiffage|eiffage.com
Electronic Arts|ea.com
Engie|engie.com
Epic Games|epicgames.com|epic
EssilorLuxottica|essilorluxottica.com|essilor
Eurosport|eurosport.fr
Expedia|expedia.com
EY|ey.com|ernst & young;ernst and young
Fnac Darty|fnacdarty.com|fnac;darty
Focus Entertainment|focus-entmt.com|focus home interactive
Free|free.fr|iliad
Galeries Lafayette|galerieslafayette.com
Gameloft|gameloft.com
Getaround|getaround.com
Google|google.com|alphabet
Groupama|groupama.fr
Hachette Livre|hachette.com|hachette
Hermès|hermes.com|hermes
Hewlett Packard Enterprise|hpe.com|hpe
HP|hp.com
H&M|hm.com|hennes & mauritz
Huawei|huawei.com
IBM|ibm.com
Ikea|ikea.com|ikea france
Illumination Mac Guff|macguff.fr|mac guff;illumination
Ingenico|ingenico.com
INRIA|inria.fr
Intel|intel.com
Intermarché|intermarche.com|les mousquetaires;intermarche
Ipsen|ipsen.com
Ipsos|ipsos.com
JCDecaux|jcdecaux.com
Kering|kering.com
KPMG|kpmg.com
L'Oréal|loreal.com|loreal;l oreal
La Banque Postale|labanquepostale.fr
La Poste|laposte.fr|groupe la poste
Lagardère|lagardere.com
Leboncoin|leboncoin.fr|le bon coin
Leclerc|e.leclerc|e.leclerc;centres e.leclerc
Legrand|legrand.com
Lidl|lidl.fr
LinkedIn|linkedin.com
Lydia|lydia-app.com|sumeria
LVMH|lvmh.com|moët hennessy louis vuitton
M6|groupem6.fr|groupe m6
Malt|malt.fr
ManoMano|manomano.fr
McKinsey|mckinsey.com|mckinsey & company
Meta|meta.com|facebook
Michelin|michelin.com
Microsoft|microsoft.com
Mikros Animation|mikrosanimation.com|mikros;mikros image;technicolor
Mirakl|mirakl.com
Mistral AI|mistral.ai|mistral
Monoprix|monoprix.fr
Moving Picture Company|mpcvfx.com|mpc
Natixis|natixis.com
Naval Group|naval-group.com
Nestlé|nestle.com|nestle
Netflix|netflix.com
Nexity|nexity.fr
Nintendo|nintendo.com
Nokia|nokia.com
Nvidia|nvidia.com
Octo Technology|octo.com|octo
OpenAI|openai.com
Oracle|oracle.com
Orange|orange.com|orange france
Orano|orano.group
OVHcloud|ovhcloud.com|ovh
Pernod Ricard|pernod-ricard.com
Pixar|pixar.com
PlayStation|playstation.com|sony interactive entertainment
Publicis|publicisgroupe.com|publicis groupe;publicis sapient
PwC|pwc.com|pricewaterhousecoopers
Qonto|qonto.com
Quantic Dream|quanticdream.com
Radio France|radiofrance.fr
RATP|ratp.fr|groupe ratp
Renault|renaultgroup.com|groupe renault;renault group
Riot Games|riotgames.com|riot
Rockstar Games|rockstargames.com|rockstar
Safran|safran-group.com
Saint-Gobain|saint-gobain.com|saint gobain
Salesforce|salesforce.com
Samsung|samsung.com
Sanofi|sanofi.com
SAP|sap.com
Schneider Electric|se.com|schneider
SEB|groupeseb.com|groupe seb
Sephora|sephora.fr
SFR|sfr.fr|altice
Shopify|shopify.com
Société Générale|societegenerale.com|societe generale;sg
Sodexo|sodexo.com
Sopra Steria|soprasteria.com
Sony|sony.com
Spotify|spotify.com
Square Enix|square-enix.com
SNCF|sncf.com|groupe sncf;sncf voyageurs;sncf réseau
Sopra Banking|soprabanking.com
Stellantis|stellantis.com|psa;peugeot;citroën
STMicroelectronics|st.com|st microelectronics
Suez|suez.com
Swile|swile.co
Thales|thalesgroup.com
TF1|groupe-tf1.fr|groupe tf1
TotalEnergies|totalenergies.com|total
Unity|unity.com|unity technologies
Valeo|valeo.com
Vallourec|vallourec.com
Veolia|veolia.com
Vinci|vinci.com|groupe vinci
Vivendi|vivendi.com
Voodoo|voodoo.io
Wakam|wakam.com
Welcome to the Jungle|welcometothejungle.com|wttj
Worldline|worldline.com
Xbox|xbox.com
Xilam|xilam.com|xilam animation
Zalando|zalando.fr
Kylotonn|kylotonn.com|kt racing;nacon studio milan
Nacon|nacongaming.com|bigben interactive
Asobo Studio|asobostudio.com|asobo
Amplitude Studios|amplitude-studios.com|amplitude
Kalypso|kalypsomedia.com
Splash Damage|splashdamage.com
Sloclap|sloclap.com
Shiro Games|shirogames.com
Motion Twin|motion-twin.com|evil empire
Cyanide|cyanide-studio.com|cyanide studio
Spiders|spiders-games.com|spiders studio
Eden Games|eden-games.com
Ivory Tower|ivorytower.fr
Owlient|owlient.eu
Wizards of the Coast|wizards.com
Supercell|supercell.com
King|king.com
Rovio|rovio.com
Valve|valvesoftware.com|steam
Bungie|bungie.net
Naughty Dog|naughtydog.com
Guerrilla Games|guerrilla-games.com|guerrilla
FromSoftware|fromsoftware.jp|from software
Capcom|capcom.com
Sega|sega.com
Konami|konami.com
Take-Two Interactive|take2games.com|take two;2k;2k games
Activision|activision.com
Mojang|mojang.com|minecraft
Paradox Interactive|paradoxinteractive.com|paradox
Remedy Entertainment|remedygames.com|remedy
DreamWorks Animation|dreamworks.com|dreamworks
Industrial Light & Magic|ilm.com|ilm
Weta FX|wetafx.co.nz|weta digital;weta
Framestore|framestore.com
DNEG|dneg.com|double negative
Cinesite|cinesite.com
TeamTO|teamto.com|team to
Cube Creative|cube-creative.com
Superprod|superprod.net
Gaumont|gaumont.com|gaumont animation
Pathé|pathe.com|pathe
France Télévisions|francetelevisions.fr|france televisions;france tv
Arte|arte.tv
Ankorstore|ankorstore.com
Contentsquare|contentsquare.com
Dataiku|dataiku.com
Ledger|ledger.com
Sorare|sorare.com
Vestiaire Collective|vestiairecollective.com
PayFit|payfit.com
Pennylane|pennylane.com
Spendesk|spendesk.com
Algolia|algolia.com
Aircall|aircall.io
Ornikar|ornikar.com
Lucca|lucca.fr
Platform.sh|platform.sh
Scaleway|scaleway.com
Hugging Face|huggingface.co|huggingface
Figma|figma.com
Canva|canva.com
Notion|notion.so
Atlassian|atlassian.com
GitHub|github.com
GitLab|gitlab.com
Stripe|stripe.com
PayPal|paypal.com
Uber|uber.com
Tesla|tesla.com
Siemens|siemens.com
Bosch|bosch.com
Volkswagen|volkswagen.com|vw;volkswagen group
BMW|bmw.com
Mercedes-Benz|mercedes-benz.com|mercedes
Toyota|toyota.com
Philips|philips.com
Unilever|unilever.com
Procter & Gamble|pg.com|p&g;procter and gamble
Johnson & Johnson|jnj.com|j&j
Pfizer|pfizer.com
Roche|roche.com
Novartis|novartis.com
GSK|gsk.com|glaxosmithkline
AstraZeneca|astrazeneca.com
Servier|servier.com
Pierre Fabre|pierre-fabre.com
bioMérieux|biomerieux.com|biomerieux
Air France-KLM|airfranceklm.com
Transdev|transdev.com
Keolis|keolis.com
Geodis|geodis.com
DHL|dhl.com
FedEx|fedex.com
UPS|ups.com
Chronopost|chronopost.fr
Colissimo|colissimo.fr
Leroy Merlin|leroymerlin.fr
Castorama|castorama.fr
Boulanger|boulanger.com
Kiabi|kiabi.com
Jacquemus|jacquemus.com
Lacoste|lacoste.com
Louis Vuitton|louisvuitton.com
Cartier|cartier.com
Yves Saint Laurent|ysl.com|saint laurent;ysl
Balenciaga|balenciaga.com
Gucci|gucci.com
Rolex|rolex.com
Swarovski|swarovski.com
Nike|nike.com
Adidas|adidas.com|adidas france
Puma|puma.com
Uniqlo|uniqlo.com
Zara|zara.com|inditex
Maisons du Monde|maisonsdumonde.com
Picard|picard.fr
Système U|magasins-u.com|super u;hyper u;coopérative u
Casino|groupe-casino.fr|groupe casino
Franprix|franprix.fr
Metro|metro.fr
Lactalis|lactalis.com
Bonduelle|bonduelle.com
Savencia|savencia.com
Fleury Michon|fleurymichon.fr
Ricard|ricard.com
Moët Hennessy|mhdfrance.fr
Rémy Cointreau|remy-cointreau.com
Heineken|theheinekencompany.com|heineken
Kronenbourg|kronenbourg.com
McDonald's|mcdonalds.fr|mcdonalds;mc donald s
Starbucks|starbucks.com
Burger King|burgerking.fr
KFC|kfc.fr
Pôle emploi|francetravail.fr|france travail;pole emploi
APEC|apec.fr
Indeed|indeed.com
HelloWork|hellowork.com
Adecco|adecco.fr|the adecco group
Randstad|randstad.fr
Manpower|manpower.fr|manpowergroup
Michael Page|michaelpage.fr|page group
Hays|hays.fr
Alten|alten.com
Altran|altran.com
Akkodis|akkodis.com|akka technologies;akka
Expleo|expleo.com
Assystem|assystem.com
Segula Technologies|segula.com|segula
Wavestone|wavestone.com
Sia Partners|sia-partners.com
BCG|bcg.com|boston consulting group
Bain & Company|bain.com|bain
Roland Berger|rolandberger.com
Onepoint|groupeonepoint.com|groupe onepoint
Inetum|inetum.com|gfi
Devoteam|devoteam.com
Neurones|neurones.net
Theodo|theodo.com
Zenika|zenika.com
Ekino|ekino.com
Havas|havas.com|havas group
Omnicom|omnicomgroup.com
WPP|wpp.com
Ogilvy|ogilvy.com
DDB|ddb.com|ddb paris
BETC|betc.com
TBWA|tbwa.com|tbwa paris
Fred & Farid|fredandfarid.com
Marcel|marcelww.com
Saatchi & Saatchi|saatchi.com
Dentsu|dentsu.com
Leo Burnett|leoburnett.com
Mazars|mazars.fr|forvis mazars
Grant Thornton|grantthornton.fr
BDO|bdo.fr
Fidal|fidal.com
Gide|gide.com|gide loyrette nouel
Allianz|allianz.fr
Generali|generali.fr
MAIF|maif.fr
MACIF|macif.fr
MAAF|maaf.fr
Matmut|matmut.fr
CNP Assurances|cnp.fr
AG2R La Mondiale|ag2rlamondiale.fr|ag2r
Malakoff Humanis|malakoffhumanis.com
Harmonie Mutuelle|harmonie-mutuelle.fr
Caisse d'Épargne|caisse-epargne.fr|caisse d epargne
LCL|lcl.fr|le crédit lyonnais
Boursorama|boursorama.com|boursobank
Hello bank!|hellobank.fr|hello bank
Revolut|revolut.com
N26|n26.com
Amundi|amundi.com
AP-HP|aphp.fr|assistance publique hôpitaux de paris
Ministère des Armées|defense.gouv.fr|armée;armee
Ministère de l'Éducation nationale|education.gouv.fr|éducation nationale;education nationale
Mairie de Paris|paris.fr|ville de paris
Région Île-de-France|iledefrance.fr
CEA|cea.fr
Météo-France|meteofrance.fr|meteo france
INSEE|insee.fr
Institut Pasteur|pasteur.fr
UNESCO|unesco.org
OCDE|oecd.org|oecd
Croix-Rouge française|croix-rouge.fr|croix rouge
Emmaüs|emmaus-france.org|emmaus
Les Restos du Cœur|restosducoeur.org|restos du coeur
Médecins Sans Frontières|msf.fr|msf
`

export interface KnownCompany {
  name: string
  domain: string
}

/** Clé de comparaison : minuscules, sans accents, sans forme juridique ni mots génériques. */
export function companyKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/\b(sa|sas|sasu|sarl|se|inc|ltd|llc|gmbh|plc|group|groupe|france|international|corp|corporation|co)\b\.?/g, ' ')
    .replace(/[^a-z0-9&+.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

let index: Map<string, KnownCompany> | null = null
function build() {
  index = new Map()
  for (const line of RAW.split('\n')) {
    const [name, domain, alt] = line.split('|')
    if (!name || !domain) continue
    const c = { name: name.trim(), domain: domain.trim() }
    for (const k of [name, ...(alt ? alt.split(';') : [])].map(companyKey)) if (k && !index.has(k)) index.set(k, c)
  }
  return index
}

/** Entreprise connue d'après son nom (« Ubisoft Montpellier » → Ubisoft, « L'Oréal Paris » → L'Oréal). */
export function findCompany(name: string): KnownCompany | undefined {
  const idx = index ?? build()
  const k = companyKey(name)
  if (!k) return undefined
  const exact = idx.get(k)
  if (exact) return exact
  // Nom suivi d'un site, d'une ville ou d'une filiale : on retire les mots de fin un à un.
  const words = k.split(' ')
  for (let n = words.length - 1; n >= 1; n--) {
    const hit = idx.get(words.slice(0, n).join(' '))
    if (hit && words.slice(0, n).join(' ').length >= 3) return hit
  }
  return undefined
}

export const knownCompanyCount = () => (index ?? build()).size

/** Messageries grand public : leur domaine n'est pas celui de l'entreprise. */
const WEBMAIL = /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|gmx|laposte|orange|free|sfr|wanadoo|neuf|bbox|numericable|club-internet)\./i

/** Domaine d'un site saisi (« https://www.ubisoft.com/fr » → « ubisoft.com »). */
export function domainOf(url: string): string {
  const m = /^(?:[a-z]+:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})(?:[:/?#]|$)/i.exec(url.trim())
  return m ? m[1].toLowerCase() : ''
}

/** Domaine à utiliser pour le logo : site renseigné, entreprise connue, puis e-mail professionnel du contact. */
export function logoDomain(company: string, website?: string, emails: string[] = []): string {
  const site = website ? domainOf(website) : ''
  if (site && !/linkedin\.com$|indeed\.|welcometothejungle\.com$/.test(site)) return site
  const known = company ? findCompany(company) : undefined
  if (known) return known.domain
  for (const e of emails) {
    const d = e.split('@')[1]?.toLowerCase().trim()
    if (d && /\.[a-z]{2,}$/.test(d) && !WEBMAIL.test(d)) return d
  }
  return ''
}
