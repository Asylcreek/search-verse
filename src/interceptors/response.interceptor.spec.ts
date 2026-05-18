import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  it('wraps successful responses', async () => {
    const interceptor = new ResponseInterceptor();
    const next: CallHandler = {
      handle: jest.fn(() => of({ id: 'translation-1' })),
    };

    await expect(
      firstValueFrom(interceptor.intercept({} as ExecutionContext, next))
    ).resolves.toEqual({
      status: 'success',
      data: { id: 'translation-1' },
    });
    expect(next.handle).toHaveBeenCalledWith();
  });
});
