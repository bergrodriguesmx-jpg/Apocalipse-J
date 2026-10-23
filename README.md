# ECOZUMBI — Terras perdidas / versão 2

Sobrevivência rural com câmera isométrica 2:1, mundo procedural sem bordas artificiais, terreno elevado, rios profundos, natação e ragdolls. O sobrevivente usa a imagem de sprites fornecida pelo autor do projeto.

## Abrir

Extraia o ZIP e abra `ecozumbi/index.html`. Preserve `assets/survivor.png`, `css/style.css` e todos os scripts da pasta `js`. Não misture arquivos da primeira versão.

A alternativa `ECOZUMBI_COMPLETO.html` contém código, CSS e imagem embutidos. Abra diretamente ou copie seu conteúdo integral para um novo `index.html`. Não precisa de CDN, instalação ou internet. A versão modular também pode ser servida por qualquer servidor estático, incluindo GitHub Pages.

## O que mudou

- O limite de 64 × 64 foi removido. Chunks de 16 × 16 células são gerados por semente e coordenadas, inclusive coordenadas negativas. Não há borda jogável fixa; existem os limites numéricos usuais do JavaScript em distâncias extremas.
- Só os polígonos de terreno que interceptam a tela entram no desenho. Objetos usam descarte por área visível com margem para copas e edifícios. Uma margem de chunks é carregada para evitar aparecimento tardio na borda da câmera.
- A região de simulação detalhada é uma área de 3 × 3 chunks ao redor do jogador. Deslocar a câmera pode carregar outras regiões para visualização, mas não transforma todo o mapa em uma simulação de alta frequência.
- Chunks que deixam de ser necessários são retirados da geometria ativa e arquivados no IndexedDB do navegador. Plantios, objetos removidos, saque restante e populações locais são restaurados na mesma sessão. A lista de regiões exploradas é um índice leve; o terreno completo não fica acumulado em RAM.
- Se o armazenamento não estiver disponível ou a quota falhar, o jogo avisa e preserva os dados em memória. Nesse modo de contingência, o histórico explorado pode consumir cada vez mais memória. O mundo infinito não significa armazenamento infinito.
- A sessão não é um sistema de salvar/carregar partida. Recarregar a página ou clicar em Novo mundo inicia uma nova sessão e limpa o arquivo temporário.
- Removidos botões de criar criaturas, multiplicadores de tempo e acesso gratuito às três armas. O jogador começa com ferramentas, duas comidas, três sementes e um cantil parcialmente cheio. Armas e munição são encontradas em ruínas; os recursos não são infinitos.

## Sprites

`assets/survivor.png` é uma cópia byte a byte da imagem enviada. Ela não foi redesenhada. `js/sprites.js` contém retângulos de origem medidos para ignorar as legendas e usa `drawImage` com suavização desligada. A direção do movimento seleciona uma das oito poses de repouso; poses disponíveis de caminhada, prontidão e ataque também são usadas.

A prancha não contém oito ciclos completos de caminhada: há direções com uma única pose, e o código não inventa quadros ausentes. Também não contém natação ou disparos com armas de fogo. Natação usa recorte de submersão e ondulações; armas de fogo são desenhadas sobre a pose do personagem. Ao morrer, o sobrevivente usa o ragdoll geométrico existente, não uma animação recortada da prancha. São limitações explícitas do material fornecido.

## Terreno e água

As quatro alturas de cada célula são compartilhadas com suas vizinhas. Colinas e margens são interpoladas; a altura física e a projeção usam o mesmo terreno. A profundidade do rio é a diferença entre a superfície da água e o leito, chegando a aproximadamente 2,7 metros. A cor distingue margem, água rasa e canal profundo.

Em água rasa o personagem anda mais devagar. Acima de 1,05 m de profundidade entra em natação, flutua parcialmente submerso e perde energia enquanto se desloca. Parar na água permite recuperar energia lentamente. Continuar nadando exausto consome fôlego; esgotá-lo causa afogamento. Voltar ao raso encerra a natação e recupera fôlego. Armas e ferramentas ficam bloqueadas durante a natação. Corpos mortos afundam com resistência da água e colidem com o leito.

Subidas reduzem a velocidade; encostas excessivamente íngremes bloqueiam avanço. Tiros colidem com relevo e obstáculos elevados. Não há simulação de correnteza, ondas volumétricas, erosão ou hidrodinâmica completa.

## Ecossistema autônomo

Na região ativa:

- Cervos e coelhos pastam, consumindo biomassa que volta a crescer conforme a umidade.
- Animais acumulam fome, sede e idade; procuram água, fogem de ameaças e podem morrer por necessidades não atendidas.
- Raposas caçam coelhos; lobos caçam cervos quando estão com fome.
- Reprodução exige adultos de sexos diferentes, proximidade, necessidades atendidas, intervalo de reprodução e espaço no orçamento populacional.
- Árvores crescem, envelhecem e podem espalhar mudas em solo adequado; arbustos recuperam frutos.
- Chuva altera umidade; cultivos dependem da umidade e da fertilidade. Irrigação consome cargas do cantil, reabastecido no rio.
- Infectados perseguem criaturas próximas. À noite têm maior alcance de detecção.

Populações iniciais são geradas com cada região. Não existe mais a antiga criação de um zumbi junto ao jogador a cada 18 segundos. Regiões novas trazem suas próprias populações; regiões revisitadas restauram as remanescentes, em vez de recriar automaticamente todos os mortos.

Quando uma região está distante, não se executam IA, perseguição ou colisões quadro a quadro. Ao retornar, aplica-se uma atualização aproximada pelo tempo decorrido: umidade, vegetação, cultivos, envelhecimento, alimento disponível e predação simplificada. Ela é limitada a duas horas equivalentes por atualização para impedir saltos extremos. A simulação distante não reproduz exatamente os mesmos eventos que teriam ocorrido com o jogador presente.

## Controles

| Entrada | Ação |
|---|---|
| WASD / setas | Mover na direção da tela |
| Shift | Correr em terra |
| Clique esquerdo | Usar ferramenta; segurar para disparar |
| 1 / 2 / 3 | Equipar pistola / rifle / escopeta, se encontrada |
| R | Recarregar |
| E | Comer |
| Direito ou botão do meio + arrastar | Deslocar câmera |
| Roda | Zoom |
| F | Recentrar câmera |
| Espaço / Escape | Pausar |

Ferramentas têm alcance de 2,8 m. Clique perto da base de árvores/rochas e dos pés de inimigos para usar ferramentas. Use Água numa margem próxima para beber e encher o cantil; em terra, para irrigar. Fogueiras custam madeira e pedra e são visuais. Não há suporte completo a controles de toque.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| index.html / css/style.css | Interface sem opções criativas |
| js/config.js | Constantes e estado |
| js/storage.js | Arquivo de chunks no IndexedDB e contingência em memória |
| js/world.js | Geração, relevo, chunks, descarte e recuperação |
| js/physics.js | Movimento terrestre/aquático, colisões e ragdolls |
| js/entities.js | Criaturas, dano, morte e hitboxes |
| js/sprites.js / assets/survivor.png | Recortes e desenho do sobrevivente |
| js/render.js | Rasterização isométrica, descarte e seleção do terreno |
| js/sim.js | Necessidades, IA, vegetação e ecossistema |
| js/weapons.js | Armas, recarga e tiros em 3D |
| js/input.js / js/hud.js | Controles e indicadores |
| js/audio.js / js/main.js | Sons e ciclo do jogo |

## Testes e limitações de validação

Execute com Node.js:

```
node tests/world.cjs
node tests/physics.cjs
```

Os testes verificam geração determinística, coordenadas negativas e distantes, descarte e recuperação de alterações, 60 deslocamentos longos, natação, afogamento, saída da água, picking sobre relevo, cultivo, colisão e estabilidade dos ragdolls, tiros e dimensões dos recortes. Na resolução interna de 480 × 300, o teste de exploração chegou a 30 chunks carregados; esse número depende da tela e do enquadramento, não é promessa universal de memória ou FPS.

Também foi executado um teste do contrato da interface com DOM simulado e renderização Canvas: inicialização, carregamento do sprite, movimento, HUD, pausa e reinício. Imagens do terreno e da natação foram inspecionadas. Isso não substitui teste manual em navegador. O caminho real de IndexedDB e a compatibilidade entre navegadores ainda precisam ser conferidos no computador do usuário; a restauração automatizada usou o backend em memória.

A física articulada permanece uma aproximação para jogo, com restrições de distância, gravidade, atrito e separação por dano. Não há biomecânica real, colisão completa entre cadáveres ou ragdolls quadrúpedes. O mundo é rural fictício procedural: não é um levantamento geográfico do Sítio São Jorge.
