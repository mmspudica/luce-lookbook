@@ -122,102 +122,137 @@ document.addEventListener('DOMContentLoaded', async () => {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      } else {
        metricError.hidden = true;
        metricError.setAttribute('hidden', '');
      }
    }
  }

  async function fetchProfileMetrics() {
    const defaultCounts = { supplier: 0, seller: 0, member: 0 };

    if (!supabaseClient) {
      console.warn('Supabase client not available.');
      cachedCounts = defaultCounts;
      cachedLatestCreatedAt = null;
      lastMetricsError = true;
      updateMetrics();
      return;
    }

    let encounteredError = false;
    const nextCounts = { ...defaultCounts };
    let latestCreatedAt = null;

    const normalizeType = (value) => {
      if (!value) {
        return '';
      }

      return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
    };

    try {
      const pageSize = 1000;
      let rangeStart = 0;
      let moreRowsAvailable = true;
      let totalCount = null;
      const rows = [];

      while (moreRowsAvailable) {
        const { data, error, count } = await supabaseClient
          .from('profiles')
          .select('user_type, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(rangeStart, rangeStart + pageSize - 1);

        if (error) {
          throw error;
        }

        if (typeof count === 'number' && count >= 0) {
          totalCount = count;
        }

        if (Array.isArray(data)) {
          rows.push(...data);
          moreRowsAvailable = data.length === pageSize;
        } else {
          moreRowsAvailable = false;
        }

        rangeStart += pageSize;
      }

      rows.forEach((row, index) => {
        if (!latestCreatedAt && index === 0 && row?.created_at) {
          latestCreatedAt = row.created_at;
        }

        const normalizedType = normalizeType(row?.user_type);

        if (normalizedType.startsWith('supplier')) {
          nextCounts.supplier += 1;
          return;
        }

        if (normalizedType.startsWith('seller')) {
          nextCounts.seller += 1;
          return;
        }

        if (normalizedType.startsWith('member')) {
          nextCounts.member += 1;
          return;
        }

        if (normalizedType.includes('seller')) {
          nextCounts.seller += 1;
          return;
        }

        nextCounts.member += 1;
      });

      const totalRowsCounted = nextCounts.supplier + nextCounts.seller + nextCounts.member;
      const expectedTotal = Number.isFinite(totalCount) ? totalCount : rows.length;

      if (expectedTotal > totalRowsCounted) {
        nextCounts.member += expectedTotal - totalRowsCounted;
      }

      console.debug('Fetched profile metrics', {
        rowsFetched: rows.length,
        counts: nextCounts,
        expectedTotal,
        latestCreatedAt
      });
    } catch (error) {
      encounteredError = true;
      console.error('Failed to load profile metrics', error);
    }

    cachedCounts = nextCounts;
    cachedLatestCreatedAt = latestCreatedAt;
    lastMetricsError = encounteredError;
    updateMetrics();
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;

      if (filter === 'all') {
        renderGrid(allData);
      } else {
        const filteredData = allData.filter(item => item.category === filter);
        renderGrid(filteredData);
      }
    });
