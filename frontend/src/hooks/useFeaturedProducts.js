import { useEffect, useState } from 'react';
import productService from '../services/productService';

const useFeaturedProducts = (limit = 8) => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    productService.getAll()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data || res;
        setFeatured((data || []).slice(0, limit));
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setFeatured([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [limit]);

  return { featured, loading };
};

export default useFeaturedProducts;