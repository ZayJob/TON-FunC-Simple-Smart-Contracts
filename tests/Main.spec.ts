import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Main } from '../wrappers/Main';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Main', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Main');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let main: SandboxContract<Main>;
    let user: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = await blockchain.treasury('user');
        admin = await blockchain.treasury('admin');

        main = blockchain.openContract(Main.createFromConfig({
            admin: admin.address
        }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await main.sendDeploy(deployer.getSender(), toNano('0.5'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: main.address,
            deploy: true,
            success: true,
        });
    });

    it('should send funds to wallet success', async () => {
        const resultSendFunds = await main.sendFunds(user.getSender(), toNano('2.5'));
        expect(resultSendFunds.transactions).toHaveTransaction({
            from: user.address,
            to: main.address,
            success: true,
            outMessagesCount: 0,
            op: 0x61636365
        })
    });

    it('should send funds to wallet and return funds', async () => {
        const resultSendFunds = await main.sendFunds(user.getSender(), toNano('1.9'));
        expect(resultSendFunds.transactions).toHaveTransaction({
            from: user.address,
            to: main.address,
            success: true,
            op: 0x61636365,
        })

        expect(resultSendFunds.transactions).toHaveTransaction({
            from: main.address,
            to: user.address,
            success: true,
            value: toNano('1.9')
        })
        const userBalanceAfter = await user.getBalance();
        expect(userBalanceAfter).toEqual(999999998036000n)
        printTransactionFees(resultSendFunds.transactions)
    });

    it('withdraw for admin', async () => {
        const resultSendFunds = await main.sendFunds(user.getSender(), toNano('3'));
        const resultWithdraw = await main.sendWithdrawAdmin(admin.getSender(), toNano('0.02'));
        expect(resultWithdraw.transactions).toHaveTransaction({
            from: admin.address,
            to: main.address,
            success: true,
            op: 0x61636364
        })

        expect(resultWithdraw.transactions).toHaveTransaction({
            from: main.address,
            to: admin.address,
            success: true,
            value: toNano('3.02')
        })
        const adminBalanceAfter = await admin.getBalance();
        expect(adminBalanceAfter).toEqual(1000002998036000n)
        printTransactionFees(resultWithdraw.transactions)
    });
});
