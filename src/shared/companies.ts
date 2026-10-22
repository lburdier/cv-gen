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
Teleperformance|teleperformance.com|tp
Eurofins Scientific|eurofins.com|eurofins
Edenred|edenred.com
Getlink|getlinkgroup.com|eurotunnel
Klépierre|klepierre.com|klepierre
Unibail-Rodamco-Westfield|urw.com|unibail;westfield
Gecina|gecina.fr
Covivio|covivio.eu
Nexans|nexans.com
Rexel|rexel.com
Spie|spie.com
Elis|elis.com
Imerys|imerys.com
Eramet|eramet.com
Rubis|rubis.fr
Technip Energies|technipenergies.com
TechnipFMC|technipfmc.com|technip
CGG|cgg.com|viridien
Interparfums|interparfums.fr
Eutelsat|eutelsat.com
Euronext|euronext.com
Coface|coface.com
SCOR|scor.com
Tikehau Capital|tikehaucapital.com|tikehau
Wendel|wendelgroup.com
Eurazeo|eurazeo.com
Ardian|ardian.com
Elior|elior-group.com
Compass Group|compass-group.com
Club Med|clubmed.fr
Pierre & Vacances-Center Parcs|groupepvcp.com|pierre et vacances;center parcs
Cultura|cultura.com
Gifi|gifi.fr
Action|action.com
Norauto|norauto.fr
Feu Vert|feuvert.fr
Mr.Bricolage|mr-bricolage.fr|mr bricolage
Bricomarché|bricomarche.com|bricomarche
Brico Dépôt|bricodepot.fr|brico depot
Kingfisher|kingfisher.com
Conforama|conforama.fr
But|but.fr
La Redoute|laredoute.fr
Veepee|veepee.fr|vente-privee;vente privée
Showroomprivé|showroomprive.com|showroomprive
Rakuten|rakuten.fr
eBay|ebay.fr
Vinted|vinted.fr
Sézane|sezane.com|sezane
Le Slip Français|leslipfrancais.fr
Jimmy Fairly|jimmyfairly.com
Michel et Augustin|michel-augustin.com
Yves Rocher|yves-rocher.fr|groupe rocher
L'Occitane|loccitane.com|l occitane en provence
Nuxe|nuxe.com
Caudalie|caudalie.com
Guerlain|guerlain.com
Givenchy|givenchy.com
Celine|celine.com
Longchamp|longchamp.com
Lancôme|lancome.fr|lancome
Kenzo|kenzo.com
Chloé|chloe.com|chloe
Sandro|sandro-paris.com
Maje|maje.com
SMCP|smcp.com
Petit Bateau|petit-bateau.fr
Aigle|aigle.com
Rossignol|rossignol.com
Salomon|salomon.com
Babolat|babolat.com
Le Coq Sportif|lecoqsportif.com
Intersport|intersport.fr
Le Monde|lemonde.fr|groupe le monde
Le Figaro|lefigaro.fr|groupe figaro
Libération|liberation.fr|liberation
Les Echos|lesechos.fr|les echos le parisien
Ouest-France|ouest-france.fr|ouest france
20 Minutes|20minutes.fr
BFM TV|bfmtv.com|bfm
France Médias Monde|francemediasmonde.com|rfi;france 24
Mediapart|mediapart.fr
Konbini|konbini.com
Brut|brut.media
Webedia|webedia-group.com
Prisma Media|prismamedia.com
Condé Nast|condenast.com|conde nast
NRJ Group|nrjgroup.fr|nrj
Banijay|banijay.com
Mediawan|mediawan.com
Studiocanal|studiocanal.com
UGC|ugc.fr
MK2|mk2.com
Pastagames|pastagames.com
Atari|atari.com
Microids|microids.com
Dotemu|dotemu.com
Blender Foundation|blender.org|blender
Maxon|maxon.net|cinema 4d
Foundry|foundry.com|the foundry
SideFX|sidefx.com|houdini
Chaos|chaos.com|chaos group;v-ray
Golaem|golaem.com
BUF|buf.com|buf compagnie
Unit Image|unit-image.fr
The Mill|themill.com
Rodeo FX|rodeofx.com
Blue Zoo|bluezoo.co.uk
Sony Pictures Imageworks|imageworks.com|imageworks
Animal Logic|animallogic.com
Bethesda|bethesda.net|bethesda softworks
Warner Bros. Games|warnerbrosgames.com|wb games
Warner Bros. Discovery|wbd.com|warner bros
Paramount|paramount.com
Universal Pictures|universalpictures.com|universal
Lucasfilm|lucasfilm.com
Marvel|marvel.com|marvel studios
Crytek|crytek.com
IO Interactive|ioi.dk|ioi
Larian Studios|larian.com|larian
Avalanche Studios|avalanchestudios.com
Ninja Theory|ninjatheory.com
Rare|rare.co.uk
Creative Assembly|creative-assembly.com
Sumo Digital|sumo-digital.com|sumo
Embark Studios|embark-studios.com|embark
Massive Entertainment|massive.se|massive
DICE|dice.se|ea dice
Hello Games|hellogames.org
Devolver Digital|devolverdigital.com|devolver
Annapurna Interactive|annapurnainteractive.com|annapurna
ServiceNow|servicenow.com
Workday|workday.com
Snowflake|snowflake.com
Databricks|databricks.com
Datadog|datadoghq.com
Cloudflare|cloudflare.com
Twilio|twilio.com
Zoom|zoom.us
Slack|slack.com
Dropbox|dropbox.com
Airtable|airtable.com
Miro|miro.com
Asana|asana.com
monday.com|monday.com|monday
HubSpot|hubspot.com
Zendesk|zendesk.com
Intercom|intercom.com
Pinterest|pinterest.com
Snap|snap.com|snapchat
TikTok|tiktok.com|bytedance
X|x.com|twitter
Reddit|reddit.com
Discord|discord.com
Twitch|twitch.tv
YouTube|youtube.com
Booking.com|booking.com|booking
Dell|dell.com|dell technologies
Lenovo|lenovo.com
Logitech|logitech.com
Asus|asus.com
Acer|acer.com
Xiaomi|mi.com
Qualcomm|qualcomm.com
Arm|arm.com
ASML|asml.com
Infineon|infineon.com
Soitec|soitec.com
JetBrains|jetbrains.com
Red Hat|redhat.com
Mozilla|mozilla.org
Wikimedia|wikimedia.org|wikipedia
Anthropic|anthropic.com
Google DeepMind|deepmind.google|deepmind
Photoroom|photoroom.com
Agicap|agicap.com
Swan|swan.io
Brevo|brevo.com|sendinblue
Mailjet|mailjet.com
Talend|talend.com
Dashlane|dashlane.com
Shift Technology|shift-technology.com
Alma|almapay.com
Too Good To Go|toogoodtogo.com
Yuka|yuka.io
Withings|withings.com
Parrot|parrot.com
Believe|believe.com
RTE|rte-france.com|réseau de transport d électricité
Enedis|enedis.fr
GRDF|grdf.fr
GRTgaz|grtgaz.com
Solvay|solvay.com
OPmobility|opmobility.com|plastic omnium
Forvia|forvia.com|faurecia
MBDA|mbda-systems.com
KNDS|knds.fr|nexter
ArianeGroup|ariane.group|ariane group
Daher|daher.com
Latécoère|latecoere.aero|latecoere
Liebherr|liebherr.com
ATR|atr-aircraft.com
Colas|colas.com
Egis|egis-group.com
Artelia|arteliagroup.com
Setec|setec.com
Systra|systra.com
Holcim|holcim.com|lafarge;lafargeholcim
Vicat|vicat.com
Somfy|somfy.fr
BPCE|groupebpce.com|groupe bpce
Rothschild & Co|rothschildandco.com|rothschild
Lazard|lazard.com
Goldman Sachs|goldmansachs.com
JPMorgan Chase|jpmorganchase.com|jp morgan;jpmorgan
Morgan Stanley|morganstanley.com
BlackRock|blackrock.com
Citi|citigroup.com|citigroup;citibank
HSBC|hsbc.com
Deutsche Bank|db.com
UBS|ubs.com
ING|ing.com
Santander|santander.com
Visa|visa.com
Mastercard|mastercard.com
American Express|americanexpress.com|amex
Allianz Trade|allianz-trade.com|euler hermes
Swiss Life|swisslife.fr
April|april.fr
Covéa|covea.com|covea
MMA|mma.fr
GMF|gmf.fr
Groupe VYV|groupe-vyv.fr|vyv
Kearney|kearney.com|at kearney
Oliver Wyman|oliverwyman.com
Eleven Strategy|eleven-strategy.com
BearingPoint|bearingpoint.com
Converteo|converteo.com
fifty-five|fifty-five.com|55
Valtech|valtech.com
Thoughtworks|thoughtworks.com
Sfeir|sfeir.com
Smile|smile.eu
Keyrus|keyrus.com
Assemblée nationale|assemblee-nationale.fr|assemblee nationale
Sénat|senat.fr|senat
Cour des comptes|ccomptes.fr
Banque mondiale|worldbank.org|world bank
ONU|un.org|nations unies;united nations
Commission européenne|commission.europa.eu|union européenne;european commission
Parlement européen|europarl.europa.eu|european parliament
Agence spatiale européenne|esa.int|esa;european space agency
ONF|onf.fr|office national des forêts
ADEME|ademe.fr
Business France|businessfrance.fr
Caisse des Dépôts|caissedesdepots.fr|caisse des depots;cdc
URSSAF|urssaf.fr
CAF|caf.fr|caisse d allocations familiales
Assurance Maladie|ameli.fr|cpam;cnam assurance maladie
Hospices Civils de Lyon|chu-lyon.fr|hcl
Fédération Française de Football|fff.fr|fff
Paris Saint-Germain|psg.fr|psg
Olympique Lyonnais|ol.fr|ol
Olympique de Marseille|om.fr|om
Musée du Louvre|louvre.fr|louvre
Centre Pompidou|centrepompidou.fr
Musée d'Orsay|musee-orsay.fr|musee d orsay
Opéra national de Paris|operadeparis.fr|opera de paris
Comédie-Française|comedie-francaise.fr|comedie francaise
BnF|bnf.fr|bibliothèque nationale de france
Cité des sciences|cite-sciences.fr|universcience
Château de Versailles|chateauversailles.fr|versailles
`

/** Écoles et universités : même format, logos affichés sur le champ « École » des stages et alternances. */
const SCHOOLS = `
Ynov Campus|ynov.com|ynov;ynov informatique;ynov campus lyon;ynov campus paris;ynov campus bordeaux;ynov campus toulouse;ynov campus nantes;ynov campus aix;ynov campus montpellier;ynov campus rennes;ynov campus sophia;ynov campus strasbourg
Sorbonne Université|sorbonne-universite.fr|sorbonne;paris sorbonne;paris iv
Université Paris Cité|u-paris.fr|paris cité;paris descartes;paris diderot
Université Paris-Saclay|universite-paris-saclay.fr|paris saclay;paris-sud
Université PSL|psl.eu|psl
Université Paris 1 Panthéon-Sorbonne|pantheonsorbonne.fr|paris 1;pantheon sorbonne
Université Paris Nanterre|parisnanterre.fr|paris nanterre;paris x;nanterre
Université Paris 8|univ-paris8.fr|paris 8;vincennes saint-denis
Université Sorbonne Nouvelle|sorbonne-nouvelle.fr|paris 3;sorbonne nouvelle
Université Sorbonne Paris Nord|univ-spn.fr|paris 13;sorbonne paris nord
Université Paris-Est Créteil|u-pec.fr|upec;paris 12
Université Gustave Eiffel|univ-gustave-eiffel.fr|gustave eiffel;marne-la-vallée
CY Cergy Paris Université|cyu.fr|cergy;cy cergy
Université de Versailles Saint-Quentin|uvsq.fr|uvsq
Université Claude Bernard Lyon 1|univ-lyon1.fr|lyon 1;lyon1
Université Lumière Lyon 2|univ-lyon2.fr|lyon 2;lyon2
Université Jean Moulin Lyon 3|univ-lyon3.fr|lyon 3;lyon3
Université Jean Monnet|univ-st-etienne.fr|saint-étienne université
Université Grenoble Alpes|univ-grenoble-alpes.fr|uga;grenoble alpes
Université Savoie Mont Blanc|univ-smb.fr|savoie mont blanc
Aix-Marseille Université|univ-amu.fr|amu;aix marseille
Université Côte d'Azur|univ-cotedazur.fr|côte d azur;nice sophia
Université de Montpellier|umontpellier.fr|montpellier
Université Paul-Valéry Montpellier 3|univ-montp3.fr|paul valery;montpellier 3
Université Toulouse Capitole|ut-capitole.fr|toulouse capitole;toulouse 1
Université Toulouse Jean Jaurès|univ-tlse2.fr|jean jaurès;toulouse 2;le mirail
Université de Bordeaux|u-bordeaux.fr|bordeaux
Université Bordeaux Montaigne|u-bordeaux-montaigne.fr|bordeaux montaigne
Nantes Université|univ-nantes.fr|université de nantes
Université de Rennes|univ-rennes.fr|rennes 1
Université Rennes 2|univ-rennes2.fr|rennes 2
Université de Lille|univ-lille.fr|lille
Université de Strasbourg|unistra.fr|unistra;strasbourg
Université de Lorraine|univ-lorraine.fr|lorraine;nancy;metz
Université de Bourgogne|u-bourgogne.fr|bourgogne;dijon
Université de Franche-Comté|univ-fcomte.fr|franche-comté;besançon
Université Clermont Auvergne|uca.fr|clermont auvergne
Université de Poitiers|univ-poitiers.fr|poitiers
Université de Tours|univ-tours.fr|tours
Université d'Orléans|univ-orleans.fr|orléans
Université de Caen Normandie|unicaen.fr|caen
Université de Rouen Normandie|univ-rouen.fr|rouen
Université Le Havre Normandie|univ-lehavre.fr|le havre
Université d'Angers|univ-angers.fr|angers
Le Mans Université|univ-lemans.fr|le mans
Université de Bretagne Occidentale|univ-brest.fr|ubo;brest
Université Bretagne Sud|univ-ubs.fr|ubs;lorient;vannes
La Rochelle Université|univ-larochelle.fr|la rochelle
Université de Limoges|unilim.fr|limoges
Université de Pau et des Pays de l'Adour|univ-pau.fr|uppa;pau
Université de Perpignan|univ-perp.fr|perpignan
Avignon Université|univ-avignon.fr|avignon
Université de Nîmes|unimes.fr|nîmes
Université de Toulon|univ-tln.fr|toulon
Université de Reims Champagne-Ardenne|univ-reims.fr|urca;reims
Université de Picardie Jules Verne|u-picardie.fr|upjv;amiens
Université d'Artois|univ-artois.fr|artois
Université du Littoral Côte d'Opale|univ-littoral.fr|ulco
Université Polytechnique Hauts-de-France|uphf.fr|uphf;valenciennes
Université de Haute-Alsace|uha.fr|mulhouse
Université de Corse|universita.corsica|corse
Université des Antilles|univ-antilles.fr|antilles
Université de La Réunion|univ-reunion.fr|la réunion
École polytechnique|polytechnique.edu|polytechnique;l x;x
CentraleSupélec|centralesupelec.fr|centrale supelec;supélec
Mines Paris|minesparis.psl.eu|mines paristech;école des mines de paris
École des Ponts ParisTech|ecoledesponts.fr|ponts et chaussées;enpc
Télécom Paris|telecom-paris.fr|télécom paristech
ENS Paris|ens.psl.eu|école normale supérieure;ens ulm
ENS de Lyon|ens-lyon.fr|ens lyon
ENS Paris-Saclay|ens-paris-saclay.fr|ens cachan
INSA Lyon|insa-lyon.fr
INSA Toulouse|insa-toulouse.fr
INSA Rennes|insa-rennes.fr
INSA Rouen Normandie|insa-rouen.fr|insa rouen
INSA Strasbourg|insa-strasbourg.fr
INSA Centre Val de Loire|insa-centrevaldeloire.fr
INSA Hauts-de-France|insa-hautsdefrance.fr
École Centrale de Lyon|ec-lyon.fr|centrale lyon
Centrale Nantes|ec-nantes.fr|école centrale de nantes
Centrale Lille|centralelille.fr
Centrale Méditerranée|centrale-mediterranee.fr|centrale marseille
Arts et Métiers|artsetmetiers.fr|ensam;arts et metiers paristech
Grenoble INP|grenoble-inp.fr
Toulouse INP|inp-toulouse.fr|inp toulouse
Bordeaux INP|bordeaux-inp.fr
ISAE-SUPAERO|isae-supaero.fr|supaero;isae
ENAC|enac.fr|école nationale de l aviation civile
IMT Atlantique|imt-atlantique.fr
IMT Mines Alès|mines-ales.fr|mines alès
Mines Saint-Étienne|mines-stetienne.fr|mines saint etienne
Télécom SudParis|telecom-sudparis.eu
ENSTA Paris|ensta-paris.fr|ensta
ENSAE Paris|ensae.fr|ensae
Ensimag|ensimag.grenoble-inp.fr
ENSEEIHT|enseeiht.fr|n7
UTC Compiègne|utc.fr|université de technologie de compiègne;utc
UTT Troyes|utt.fr|université de technologie de troyes
UTBM|utbm.fr|université de technologie de belfort-montbéliard
EPITA|epita.fr
Epitech|epitech.eu
Efrei|efrei.fr|efrei paris
ESIEE Paris|esiee.fr|esiee
ECE Paris|ece.fr|ece
ESILV|esilv.fr|de vinci;pôle léonard de vinci
ISEP|isep.fr
ESIEA|esiea.fr
EPF|epf.fr|epf école d ingénieurs
ESTACA|estaca.fr
IPSA|ipsa.fr
ESME|esme.fr|esme sudria
ECAM|ecam.fr|ecam lasalle
Junia|junia.com|hei;isa;isen lille
ISEN|isen.fr|isen méditerranée;isen ouest
CY Tech|cytech.cyu.fr|eisti
ESIGELEC|esigelec.fr
ENSEA|ensea.fr
Polytech|polytech-reseau.org|réseau polytech
École 42|42.fr|42;42 paris;42 lyon
Supinfo|supinfo.com
EPSI|epsi.fr
IIM Digital School|iim.fr|iim;institut de l internet et du multimédia
HETIC|hetic.net
ESGI|esgi.fr
Le Wagon|lewagon.com
OpenClassrooms|openclassrooms.com
Simplon|simplon.co
O'clock|oclock.io|oclock
Wild Code School|wildcodeschool.com
CESI|cesi.fr|cesi école d ingénieurs
HEC Paris|hec.edu|hec
ESSEC|essec.edu|essec business school
ESCP|escp.eu|escp business school;escp europe
EDHEC|edhec.edu|edhec business school
emlyon business school|em-lyon.com|em lyon;emlyon
Grenoble École de Management|grenoble-em.com|gem;grenoble em
SKEMA Business School|skema.edu|skema
Audencia|audencia.com
NEOMA Business School|neoma-bs.fr|neoma
KEDGE Business School|kedge.edu|kedge
TBS Education|tbs-education.com|toulouse business school;tbs
Rennes School of Business|rennes-sb.com|rennes sb
Montpellier Business School|montpellier-bs.com|mbs
IÉSEG|ieseg.fr|ieseg
ICN Business School|icn-artem.com|icn
EM Strasbourg|em-strasbourg.eu
Excelia|excelia-group.fr|la rochelle business school
ISC Paris|iscparis.com
INSEEC|inseec.com|inseec grande école
PSB Paris School of Business|psbedu.paris|psb
ESSCA|essca.fr
EM Normandie|em-normandie.com
BSB Burgundy School of Business|bsb-education.com|bsb;burgundy school of business
Clermont School of Business|clermont-sb.fr|esc clermont
Sciences Po|sciencespo.fr|iep paris
IAE Paris-Sorbonne|iae-paris.com|iae paris
Université Paris Dauphine-PSL|dauphine.psl.eu|dauphine;paris dauphine
ISG|isg.fr
EFAP|efap.com
ISCOM|iscom.fr
Sup de Pub|supdepub.com
CELSA|celsa.fr|celsa sorbonne
IPAG Business School|ipag.edu|ipag
ESG|esg.fr|esg business school
Brest Business School|brest-bs.com
IDRAC Business School|idrac-business-school.com|idrac
Gobelins Paris|gobelins.fr|gobelins;les gobelins
ESMA|esma-artistique.com|école supérieure des métiers artistiques
Rubika|rubika-edu.com|supinfocom;supinfogame
ArtFX|artfx.school|artfx
ISART Digital|isart.fr|isart
LISAA|lisaa.com
ECV|ecv.fr|école de communication visuelle
e-artsup|e-artsup.net
Arts Décoratifs|ensad.fr|ensad;école des arts décoratifs;arts deco
ENSCI Les Ateliers|ensci.com|ensci
Beaux-Arts de Paris|beauxartsparis.fr|ensba;beaux arts paris
École Estienne|ecole-estienne.paris|estienne
Penninghen|penninghen.fr|esag penninghen
Strate École de Design|strate.design|strate
École de Condé|ecoles-conde.com|conde
ENJMIN|enjmin.cnam.fr|cnam enjmin
Bellecour École|bellecour.fr|bellecour
École Émile Cohl|cohl.fr|emile cohl
ICAN|ican-design.fr|institut de création et d animation numériques
Creative Seeds|creativeseeds.fr
Pôle 3D|pole3d.com|pole 3d
Brassart|brassart.fr|école brassart
La Fémis|femis.fr|femis
ENS Louis-Lumière|ens-louis-lumiere.fr|louis lumière
3IS|3is.fr|institut international de l image et du son
ESRA|esra.edu
CinéFabrique|cinefabrique.fr
École Boulle|ecole-boulle.org|boulle
École Duperré|esaa-duperre.fr|duperré
ENSAAMA Olivier de Serres|ensaama.net|olivier de serres
Villa Arson|villa-arson.fr
HEAR|hear.fr|haute école des arts du rhin
Beaux-Arts de Lyon|ensba-lyon.fr|ensba lyon
ESADSE|esadse.fr|beaux-arts de saint-étienne
École du Louvre|ecoledulouvre.fr
Institut Français de la Mode|ifmparis.fr|ifm
ESMOD|esmod.com
MIT|mit.edu|massachusetts institute of technology
Stanford University|stanford.edu|stanford
Harvard University|harvard.edu|harvard
University of Oxford|ox.ac.uk|oxford
University of Cambridge|cam.ac.uk|cambridge
ETH Zurich|ethz.ch|eth zürich
EPFL|epfl.ch|école polytechnique fédérale de lausanne
Imperial College London|imperial.ac.uk|imperial college
UCL|ucl.ac.uk|university college london
LSE|lse.ac.uk|london school of economics
INSEAD|insead.edu
Politecnico di Milano|polimi.it|polimi
TU Delft|tudelft.nl|delft
KU Leuven|kuleuven.be|leuven
UCLouvain|uclouvain.be|louvain-la-neuve
ULB|ulb.be|université libre de bruxelles
Université de Genève|unige.ch|unige;genève
Université de Lausanne|unil.ch|unil;lausanne
Université de Montréal|umontreal.ca|udem;montréal
Université McGill|mcgill.ca|mcgill
Université Laval|ulaval.ca|laval
UQAM|uqam.ca|université du québec à montréal
Université Concordia|concordia.ca|concordia
`

export interface KnownCompany {
  name: string
  domain: string
  kind: 'entreprise' | 'ecole'
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

// Un index par catégorie : un alias d'école qui est un nom de ville (« Bordeaux ») ne doit pas
// donner le logo d'une université à une entreprise « Bordeaux Métropole ».
let index: Record<KnownCompany['kind'], Map<string, KnownCompany>> | null = null
let list: KnownCompany[] = []
function build() {
  index = { entreprise: new Map(), ecole: new Map() }
  list = []
  const add = (raw: string, kind: KnownCompany['kind']) => {
    for (const line of raw.split('\n')) {
      const [name, domain, alt] = line.split('|')
      if (!name || !domain) continue
      const c: KnownCompany = { name: name.trim(), domain: domain.trim(), kind }
      list.push(c)
      const idx = index![kind]
      for (const k of [name, ...(alt ? alt.split(';') : [])].map(companyKey)) if (k && !idx.has(k)) idx.set(k, c)
    }
  }
  add(RAW, 'entreprise')
  add(SCHOOLS, 'ecole')
  return index
}

/** Noms connus, pour l'autocomplétion (entreprises ou écoles). */
export function knownNames(kind: KnownCompany['kind']): string[] {
  if (!index) build()
  return list.filter((c) => c.kind === kind).map((c) => c.name)
}

/**
 * Entreprise (ou école) connue d'après son nom : « Ubisoft Montpellier » → Ubisoft, « Ynov Campus Lyon » → Ynov.
 * Côté entreprise, une école n'est reconnue que sur son nom exact (candidature dans une université, par exemple).
 */
export function findCompany(name: string, kind: KnownCompany['kind'] = 'entreprise'): KnownCompany | undefined {
  const all = index ?? build()
  const idx = all[kind]
  const k = companyKey(name)
  if (!k) return undefined
  // Écoles : « Université Lyon 2 » se cherche aussi comme « Lyon 2 ».
  const bare = kind === 'ecole' ? k.replace(/^(universite|univ|ecole|institut)( de la| de| du| des| d)? /, '') : k
  const exact = idx.get(k) ?? idx.get(bare) ?? (kind === 'entreprise' ? all.ecole.get(k) : undefined)
  if (exact) return exact
  // Nom suivi d'un site, d'une ville ou d'une filiale : on retire les mots de fin un à un.
  const words = k.split(' ')
  for (let n = words.length - 1; n >= 1; n--) {
    const prefix = words.slice(0, n).join(' ')
    const hit = idx.get(prefix)
    if (hit && prefix.length >= 3) return hit
  }
  return undefined
}

export const findSchool = (name: string) => findCompany(name, 'ecole')

export const knownCount = (kind: KnownCompany['kind']) => knownNames(kind).length

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
