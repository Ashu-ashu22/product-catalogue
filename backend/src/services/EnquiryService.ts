import type { EnquiryNotifier, ProductRepository } from '../domain/ports.js';
import { NotFoundError } from '../domain/errors.js';

export interface EnquiryInput {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export class EnquiryService {
  constructor(
    private readonly products: ProductRepository,
    private readonly notifier: EnquiryNotifier,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Validates that the product exists (so the email always names a real
   * product, taken from OUR data rather than trusting the client) and then
   * notifies sales. Resolves only once the notification has been accepted.
   */
  async submit(input: EnquiryInput): Promise<void> {
    const product = await this.products.findById(input.productId);
    if (!product) throw new NotFoundError(`Product "${input.productId}" not found`);

    await this.notifier.notify({
      product: { id: product.id, title: product.title },
      customer: { name: input.name, email: input.email, phone: input.phone },
      message: input.message,
      receivedAt: this.now(),
    });
  }
}
