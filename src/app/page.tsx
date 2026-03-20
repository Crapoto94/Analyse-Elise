import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl glass p-12 rounded-3xl animate-fade-in">
        <div className="mb-6 inline-block px-4 py-1.5 bg-blue-500/10 text-blue-600 rounded-full text-sm font-semibold tracking-wide uppercase">
          Exploitation OData Elise BI
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Stat Elise Explorer
        </h1>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed">
          Connectez-vous à votre passerelle OData Elise BI pour explorer, filtrer et analyser vos données statistiques en temps réel.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/connect" className="btn-primary">
            Commencer l&apos;exploration
          </Link>
          <a 
            href="https://www.neoledge.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
          >
            Documentation Elise
          </a>
        </div>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        <FeatureCard 
          icon="📊" 
          title="Données Statistiques" 
          description="Accédez aux dossiers, courriers et tâches pour une analyse approfondie." 
        />
        <FeatureCard 
          icon="🔍" 
          title="Filtres Avancés" 
          description="Utilisez la puissance du protocole OData pour segmenter vos données." 
        />
        <FeatureCard 
          icon="🛡️" 
          title="Sécurisé" 
          description="Authentification Basic standard sur flux HTTPS pour une sécurité maximale." 
        />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card text-left">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}
