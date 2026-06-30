import { Leaf } from 'lucide-react';
import { WalletProvider } from './wallet/WalletContext';
import { WalletPanel } from './components/WalletPanel';

export default function App(): JSX.Element {
    return (
        <WalletProvider>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '16px 24px',
                        borderBottom: '1px solid var(--border-soft)'
                    }}
                >
                    <Leaf size={20} color="var(--accent)" />
                    <strong style={{ fontSize: 15, letterSpacing: '-0.01em' }}>GG Bounty</strong>
                    <span className="text-muted" style={{ fontSize: 12, marginLeft: 4 }}>
                        decentralized bounty marketplace on Canopy
                    </span>
                </header>

                <main
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        padding: '48px 24px'
                    }}
                >
                    <WalletPanel />
                </main>
            </div>
        </WalletProvider>
    );
}
