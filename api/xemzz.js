/*
Bebas modifikasi ya cuy
Pasti work 100% ya
*/
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const url = new URL(`http://${req.headers.host}${req.url}`);
        const searchParams = url.searchParams;
        
        const text = searchParams.get('text');

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Text parameter is required',
                creator: "XemzzXiterz"
            });
        }

        try {
            const result = await scrapeCopilotAI(text);
            
            return res.status(200).json({
                status: true,
                statusCode: 200,
                creator: "XemzzXiterz",
                result: {
                    text: result.text,
                    citations: result.citations || []
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                error: error.message,
                creator: "XemzzXiterz"
            });
        }
    }

    return res.status(405).json({
        status: false,
        error: 'Method not allowed'
    });
}

async function scrapeCopilotAI(question) {
    try {
        if (!question) throw new Error('Question is required.');
        
        const conversationResponse = await fetch('https://copilot.microsoft.com/c/api/conversations', {
            method: 'POST',
            headers: {
                'Origin': 'https://copilot.microsoft.com',
                'Referer': 'https://copilot.microsoft.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json'
            }
        });
        
        const conversationData = await conversationResponse.json();
        const conversationId = conversationData.id;
        
        if (!conversationId) {
            throw new Error('Failed to create conversation');
        }
        
        return new Promise((resolve, reject) => {
            const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`;
            
            const ws = new WebSocket(wsUrl, {
                origin: 'https://copilot.microsoft.com',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const response = { text: '', citations: [] };
            let timeoutId;
            
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    event: 'setOptions',
                    supportedFeatures: ['partial-generated-images'],
                    supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
                    ads: {
                        supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion']
                    }
                }));

                ws.send(JSON.stringify({
                    event: 'send',
                    mode: 'chat',
                    conversationId: conversationId,
                    content: [{ type: 'text', text: question }],
                    context: {}
                }));
                
                timeoutId = setTimeout(() => {
                    ws.close();
                    reject(new Error('Request timeout'));
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    
                    switch (parsed.event) {
                        case 'appendText':
                            response.text += parsed.text || '';
                            break;
                            
                        case 'citation':
                            response.citations.push({
                                title: parsed.title,
                                icon: parsed.iconUrl,
                                url: parsed.url
                            });
                            break;
                            
                        case 'done':
                            clearTimeout(timeoutId);
                            resolve(response);
                            ws.close();
                            break;
                            
                        case 'error':
                            clearTimeout(timeoutId);
                            reject(new Error(parsed.message));
                            ws.close();
                            break;
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            };
            
            ws.onerror = (error) => {
                clearTimeout(timeoutId);
                reject(new Error(`WebSocket error: ${error.message}`));
            };
            
            ws.onclose = () => {
                clearTimeout(timeoutId);
                if (response.text === '') {
                    reject(new Error('Connection closed prematurely'));
                }
            };
        });
        
    } catch (error) {
        throw new Error(`Copilot scrape error: ${error.message}`);
    }
              }
