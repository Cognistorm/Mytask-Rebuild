import { Global, Module } from '@nestjs/common';
import { ClientIpResolver } from './client-ip.resolver';

@Global()
@Module({ providers: [ClientIpResolver], exports: [ClientIpResolver] })
export class ClientIpModule {}
