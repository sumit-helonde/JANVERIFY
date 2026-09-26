import { useQuery, type QueryKey } from '@tanstack/react-query'

export function useResource<T>(key: QueryKey, fetcher: () => Promise<T>) {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime: 5 * 60_000,
    retry: 0,
  })
}

export function useResourceWithParam<T>(
  base: QueryKey,
  id: string,
  fetcher: (id: string) => Promise<T>,
) {
  return useQuery({
    queryKey: [...base, id],
    queryFn: () => fetcher(id),
    staleTime: 5 * 60_000,
    retry: 0,
    enabled: !!id,
  })
}