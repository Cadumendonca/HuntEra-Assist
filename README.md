# HuntEra Assist — extensão Chrome

Extensão Manifest V3 com auto aceitar e um overlay de **Damage Done** que mostra dano total, DPS, golpes, maior hit, críticos e participação do grupo.

## Instalar no Chrome

1. Abra `chrome://extensions` e ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione esta pasta.
3. Recarregue a aba do HuntEra.
4. Use o ícone da extensão para ligar/desligar recursos ou zerar o combate.

O painel é arrastável, recolhível e possui modo compacto. A sessão continua acumulando até o usuário clicar em reiniciar. Preferências e contador ficam somente no Chrome; nada é enviado a servidores externos.

A extensão não move o cursor, não traz janelas para frente e não requer privilégios administrativos. Nenhuma captura de tela é salva e os dados de combate não são enviados para servidores externos.

## Calibração

O DPS captura o evento visual `creature-hit` que alimenta o Phaser. Ele associa `attackerId` ao nome dos jogadores da party e soma `value`, sem depender do log de combate. A extensão não abre nem altera as opções do chat.
