import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem("@RocketShoes:cart");

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const { data } = await api.get<Stock>(`stock/${productId}`);
			const stock = data.amount;

			if (stock < 1) {
				throw new Error("Quantidade solicitada fora de estoque");
			}

			const productIsOnCart = cart.some((product) => product.id === productId);

			if (productIsOnCart) {
				const products = cart.map((product) => {
					if (product.id === productId) {
						if (product.amount < stock) {
							product.amount++;
						} else {
							throw new Error("Quantidade solicitada fora de estoque");
						}
					}

					return product;
				});

				setCart(products);
				localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
			} else {
				const response = await api.get(`products/${productId}`);
				const product = { ...response.data, amount: 1 };
				const newProducts = [...cart, product];

				setCart(newProducts);
				localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProducts));
			}
		} catch (error) {
			if (error instanceof Error) {
				if (error.message === "Quantidade solicitada fora de estoque") {
					toast.error("Quantidade solicitada fora de estoque");
				} else {
					toast.error("Erro na adição do produto");
				}
			}
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const productIsOnCart = cart.some((product) => product.id === productId);

			if (!productIsOnCart) throw new Error();

			const products = cart.filter((product) => product.id !== productId);

			setCart(products);
			localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
		} catch {
			toast.error("Erro na remoção do produto");
		}
	};

	const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
		if (amount > 0) {
			try {
				const response = await api.get(`stock/${productId}`);
				const stock = response.data.amount;

				if (amount > stock) {
					throw new Error("Quantidade solicitada fora de estoque");
				}

				const productIsOnCart = cart.some((product) => product.id === productId);

				if (productIsOnCart) {
					const products = cart.map((product) => {
						if (product.id === productId) {
							product.amount = amount;
						}

						return product;
					});

					setCart(products);
					localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));
				} else {
					// Se não estiver no carrinho, é para lançar erro ou adicionar produto?
					throw new Error();
					/* 	const response = await api.get(`products/${productId}`);
					const product = { ...response.data, amount: 1 };
					const newProducts = [...cart, product];

					setCart(newProducts);
					localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProducts)); */
				}
			} catch (error) {
				if (error instanceof Error) {
					if (error.message === "Quantidade solicitada fora de estoque") {
						toast.error("Quantidade solicitada fora de estoque");
					} else {
						toast.error("Erro na alteração de quantidade do produto");
					}
				}
			}
		}
	};

	return (
		<CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
