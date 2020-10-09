import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError("Customer don't exists");
    }

    const productsData = await this.productsRepository.findAllById(products);

    if (productsData.length !== products.length) {
      throw new AppError('Invalid products on request');
    }

    productsData.map(product => {
      const quantityIndex = products.findIndex(
        productQuantity => productQuantity.id === product.id,
      );

      if (product.quantity < products[quantityIndex].quantity) {
        throw new AppError('there is not enough product');
      }
    });

    const updateProductsQuantity = productsData.map(product => {
      const quantityIndex = products.findIndex(
        productQuantity => productQuantity.id === product.id,
      );

      return {
        id: product.id,
        quantity: product.quantity - products[quantityIndex].quantity,
      };
    });

    const order_products = productsData.map(product => {
      const quantityIndex = products.findIndex(
        productQuantity => productQuantity.id === product.id,
      );

      return {
        product_id: product.id,
        price: product.price,
        quantity: products[quantityIndex].quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: order_products,
    });

    await this.productsRepository.updateQuantity(updateProductsQuantity);

    return order;
  }
}

export default CreateOrderService;
